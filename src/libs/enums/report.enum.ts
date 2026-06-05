export enum ReportType {
  QUESTION = 'QUESTION', 
  TEST     = 'TEST',     
}

export enum ReportStatus {
  PENDING  = 'PENDING',  
  REVIEWED = 'REVIEWED', 
  RESOLVED = 'RESOLVED', 
  REJECTED = 'REJECTED', 
}

export enum ReportReason {
  WRONG_ANSWER   = 'WRONG_ANSWER',   
  WRONG_QUESTION = 'WRONG_QUESTION', 
  TYPO           = 'TYPO',           
  UNCLEAR        = 'UNCLEAR',      
  OTHER          = 'OTHER',          
}