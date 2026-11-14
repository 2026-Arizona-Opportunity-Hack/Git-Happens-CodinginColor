// Fake exports shaped like each source, for demoing import + dedupe.
// Replace column names once CIC shares real (scrubbed) samples.

export const SAMPLE_CSV = {
  spreadsheet: `Name,Email,Phone,Organization,Amount,Date
Maria Lopez,,602-555-0141,,50,2024-12-03
Luis Garcia,,(602) 555-0177,,300,2026-02-14
Rosa Martinez,rosa.m@example.com,,,500,2026-05-20
Tom Becker,,480 555 0123,Becker Family Fund,2500,2026-08-15`,
  zeffy: `First Name,Last Name,Email,Total Amount,Payment Date
Maria,Lopez,MARIA.LOPEZ@example.com,"$100.00",2025-12-02
Rosa,Martinez,rosa.m@example.com,"$25.00",2026-12-01
Nia,Washington,nia.w@example.com,"$40.00",2026-11-10`,
  benevity: `Donor Name,Email,Company,Donation Amount,Donation Date
Kevin Tran,ktran@example.com,Intel,500,2026-06-30
Thomas Becker,tbecker@example.com,Becker Family Fund,1000,2026-09-01
Priya Shah,pshah@example.com,Intel,250,2026-10-15`,
}
