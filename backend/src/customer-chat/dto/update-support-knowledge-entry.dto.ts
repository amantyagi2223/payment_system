import { PartialType } from '@nestjs/mapped-types';
import { CreateSupportKnowledgeEntryDto } from './create-support-knowledge-entry.dto';

export class UpdateSupportKnowledgeEntryDto extends PartialType(
  CreateSupportKnowledgeEntryDto,
) {}
