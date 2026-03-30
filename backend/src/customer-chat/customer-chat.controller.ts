import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';
import { CustomerChatService } from './customer-chat.service';
import { SendCustomerChatMessageDto } from './dto/send-customer-chat-message.dto';
import { ListCustomerChatSessionsDto } from './dto/list-customer-chat-sessions.dto';
import { ListCustomerChatMessagesDto } from './dto/list-customer-chat-messages.dto';
import { GetCustomerChatDiagnosticsDto } from './dto/get-customer-chat-diagnostics.dto';

@Controller('customer/chat')
@UseGuards(CustomerAuthGuard)
export class CustomerChatController {
  constructor(private readonly customerChatService: CustomerChatService) {}

  @Post('message')
  sendMessage(@Req() req: any, @Body() dto: SendCustomerChatMessageDto) {
    return this.customerChatService.sendMessage(req.user.customerId, dto);
  }

  @Get('sessions')
  listSessions(@Req() req: any, @Query() query: ListCustomerChatSessionsDto) {
    return this.customerChatService.listSessions(req.user.customerId, query);
  }

  @Get('sessions/:sessionId/messages')
  listMessages(
    @Req() req: any,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query() query: ListCustomerChatMessagesDto,
  ) {
    return this.customerChatService.listMessages(
      req.user.customerId,
      sessionId,
      query,
    );
  }

  @Get('diagnostics')
  diagnostics(@Query() query: GetCustomerChatDiagnosticsDto) {
    return this.customerChatService.getDiagnostics(query);
  }
}
