{
  description = "Git Happens: donor & funder platform for Coding in Color";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      # `nix develop`: bun for scripts, node because wrangler runs on it
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [ pkgs.bun pkgs.nodejs_22 ];
        };
      });

      # `nix build`: the production bundle, laid out the way `wrangler deploy`
      # expects it (dist/ plus the .wrangler/deploy redirect the Vite plugin writes)
      packages = forAllSystems (pkgs:
        let
          src = pkgs.lib.fileset.toSource {
            root = ./.;
            fileset = pkgs.lib.fileset.unions [
              ./package.json ./bun.lock ./index.html ./components.json ./wrangler.jsonc ./vite.config.ts
              ./tsconfig.json ./tsconfig.app.json ./tsconfig.node.json ./tsconfig.worker.json
              ./src ./worker
            ];
          };

          # Fixed-output derivation, so bun may use the network. Native packages
          # (workerd, oxlint, rolldown) differ per platform, hence one hash each.
          # After changing bun.lock, set the hash to "" and copy the one nix prints.
          node_modules = pkgs.stdenvNoCC.mkDerivation {
            pname = "cic-donors-node_modules";
            version = "0.0.0";
            inherit src;
            nativeBuildInputs = [ pkgs.bun ];
            dontConfigure = true;
            buildPhase = ''
              export HOME=$TMPDIR
              bun install --frozen-lockfile --ignore-scripts --no-progress
            '';
            installPhase = "cp -r node_modules $out";
            dontFixup = true;
            outputHashMode = "recursive";
            outputHashAlgo = "sha256";
            outputHash = {
              x86_64-linux = "sha256-IJLtwJ0IHCXdGwpwtmFxdUpAuEEU0Plcd/PEgAvqHsQ=";
            }.${pkgs.stdenv.hostPlatform.system} or pkgs.lib.fakeHash;
          };
        in
        {
          default = pkgs.stdenvNoCC.mkDerivation {
            pname = "cic-donors";
            version = "0.0.0";
            inherit src;
            nativeBuildInputs = [ pkgs.bun pkgs.nodejs_22 ];
            buildPhase = ''
              export HOME=$TMPDIR
              cp -r ${node_modules} node_modules
              chmod -R u+w node_modules
              patchShebangs node_modules
              bun run build
            '';
            installPhase = ''
              mkdir -p $out/.wrangler
              cp -r dist $out/dist
              cp -r .wrangler/deploy $out/.wrangler/deploy
            '';
          };
        });
    };
}
