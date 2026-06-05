import { registerEnumType } from '@nestjs/graphql';

export enum ReportType {
  QUESTION = 'QUESTION', 
  TEST     = 'TEST',     
}
registerEnumType(ReportType, { name: 'ReportType' });

export enum ReportStatus {
  PENDING  = 'PENDING',  
  REVIEWED = 'REVIEWED', 
  RESOLVED = 'RESOLVED', 
  REJECTED = 'REJECTED', 
}
registerEnumType(ReportStatus, { name: 'ReportStatus' });

export enum ReportReason {
  WRONG_ANSWER   = 'WRONG_ANSWER',   
  WRONG_QUESTION = 'WRONG_QUESTION', 
  TYPO           = 'TYPO',           
  UNCLEAR        = 'UNCLEAR',      
  OTHER          = 'OTHER',          
}
registerEnumType(ReportReason, { name: 'ReportReason' });