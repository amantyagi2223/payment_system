import {
  ArrayMaxSize,
  IsBoolean,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SupportKnowledgeSourceType } from '@prisma/client';

export class CreateSupportKnowledgeEntryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @IsString()
  @MinLength(20)
  @MaxLength(20000)
  content: string;

  @IsOptional()
  @IsEnum(SupportKnowledgeSourceType)
  sourceType?: SupportKnowledgeSourceType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourcePath?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  keywords?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
