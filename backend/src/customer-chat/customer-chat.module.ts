import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomerChatController } from './customer-chat.controller';
import { CustomerChatService } from './customer-chat.service';
import { SupportKnowledgeAutoSyncService } from './support-knowledge-auto-sync.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerChatController],
  providers: [CustomerChatService, SupportKnowledgeAutoSyncService],
  exports: [CustomerChatService],
})
export class CustomerChatModule {}
