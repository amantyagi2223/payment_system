import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreateSupportKnowledgeEntryDto } from './create-support-knowledge-entry.dto';

export class ImportSupportKnowledgeBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateSupportKnowledgeEntryDto)
  items: CreateSupportKnowledgeEntryDto[];

  @IsOptional()
  @IsBoolean()
  replaceBySlug?: boolean;
}
