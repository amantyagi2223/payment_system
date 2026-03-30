import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { DashboardRangeDto } from '../common/dto/dashboard-range.dto';
import { LoginSuperAdminDto } from './dto/login-super-admin.dto';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminGuard } from './super-admin.guard';
import { UpsertGasWalletDto } from './dto/upsert-gas-wallet.dto';
import { UpsertFeeWalletDto } from './dto/upsert-fee-wallet.dto';
import { OrdersService } from '../orders/orders.service';
import { UpsertNetworkTokenDto } from './dto/upsert-network-token.dto';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CreateBlockchainNetworkDto } from './dto/create-blockchain-network.dto';
import { UpdateBlockchainNetworkDto } from './dto/update-blockchain-network.dto';
import { CustomerChatService } from '../customer-chat/customer-chat.service';
import { ListSupportKnowledgeEntriesDto } from '../customer-chat/dto/list-support-knowledge-entries.dto';
import { CreateSupportKnowledgeEntryDto } from '../customer-chat/dto/create-support-knowledge-entry.dto';
import { UpdateSupportKnowledgeEntryDto } from '../customer-chat/dto/update-support-knowledge-entry.dto';
import { ImportSupportKnowledgeBatchDto } from '../customer-chat/dto/import-support-knowledge-batch.dto';

@Controller('super-admin')
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly ordersService: OrdersService,
    private readonly blockchainService: BlockchainService,
    private readonly customerChatService: CustomerChatService,
  ) {}

  @Post('login')
  login(@Body() body: LoginSuperAdminDto) {
    return this.superAdminService.login(body);
  }

  @UseGuards(SuperAdminGuard)
  @Get('dashboard')
  getDashboard(@Req() req: Request, @Query() query: DashboardRangeDto) {
    const admin = (req as any).admin;

    return this.superAdminService.getDashboard(
      admin,
      query.days ? Number(query.days) : undefined,
    );
  }

  @UseGuards(SuperAdminGuard)
  @Get('product-categories')
  listProductCategories(@Query('includeInactive') includeInactive?: string) {
    return this.superAdminService.listProductCategories(
      includeInactive !== 'false',
    );
  }

  @UseGuards(SuperAdminGuard)
  @Post('product-categories')
  createProductCategory(@Body() body: CreateProductCategoryDto) {
    return this.superAdminService.createProductCategory(body);
  }

  @UseGuards(SuperAdminGuard)
  @Delete('product-categories/:categoryId')
  deleteProductCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ) {
    return this.superAdminService.deleteProductCategory(categoryId);
  }

  @UseGuards(SuperAdminGuard)
  @Get('networks')
  async listNetworks(@Query('includeInactive') includeInactive?: string) {
    const networks =
      includeInactive === 'false'
        ? await this.blockchainService.listActiveNetworks()
        : await this.blockchainService.listAllNetworks();

    return networks.map((network) => ({
      ...network,
      chainId: network.chainId.toString(),
    }));
  }

  @UseGuards(SuperAdminGuard)
  @Post('networks')
  async createNetwork(@Body() body: CreateBlockchainNetworkDto) {
    const network = await this.blockchainService.createCustomNetwork({
      code: body.code,
      name: body.name,
      chainId: body.chainId,
      rpcUrl: body.rpcUrl,
      symbol: body.symbol,
    });

    return {
      ...network,
      chainId: network.chainId.toString(),
    };
  }

  @UseGuards(SuperAdminGuard)
  @Patch('networks/:networkId')
  async updateNetwork(
    @Param('networkId', ParseUUIDPipe) networkId: string,
    @Body() body: UpdateBlockchainNetworkDto,
  ) {
    const network = await this.blockchainService.updateNetwork(networkId, {
      code: body.code,
      name: body.name,
      chainId: body.chainId,
      rpcUrl: body.rpcUrl,
      symbol: body.symbol,
      isActive: body.isActive,
    });

    return {
      ...network,
      chainId: network.chainId.toString(),
    };
  }

  @UseGuards(SuperAdminGuard)
  @Delete('networks/:networkId')
  async deactivateNetwork(
    @Param('networkId', ParseUUIDPipe) networkId: string,
  ) {
    const network = await this.blockchainService.deactivateNetwork(networkId);
    return {
      ...network,
      chainId: network.chainId.toString(),
    };
  }

  @UseGuards(SuperAdminGuard)
  @Post('networks/:networkId/activate')
  async activateNetwork(@Param('networkId', ParseUUIDPipe) networkId: string) {
    const network = await this.blockchainService.activateNetwork(networkId);
    return {
      ...network,
      chainId: network.chainId.toString(),
    };
  }

  @UseGuards(SuperAdminGuard)
  @Get('wallets')
  listAllWallets() {
    return this.superAdminService.getAdminWalletOverview();
  }

  @UseGuards(SuperAdminGuard)
  @Get('networks/:networkId/tokens')
  listNetworkTokens(@Param('networkId', ParseUUIDPipe) networkId: string) {
    return this.superAdminService.listNetworkTokens(networkId);
  }

  @UseGuards(SuperAdminGuard)
  @Put('networks/:networkId/tokens/:symbol')
  upsertNetworkToken(
    @Param('networkId', ParseUUIDPipe) networkId: string,
    @Param('symbol') symbol: string,
    @Body() body: UpsertNetworkTokenDto,
  ) {
    return this.superAdminService.upsertNetworkToken(networkId, symbol, body);
  }

  @UseGuards(SuperAdminGuard)
  @Delete('networks/:networkId/tokens/:symbol')
  deactivateNetworkToken(
    @Param('networkId', ParseUUIDPipe) networkId: string,
    @Param('symbol') symbol: string,
  ) {
    return this.superAdminService.deactivateNetworkToken(networkId, symbol);
  }

  @UseGuards(SuperAdminGuard)
  @Get('gas-wallets')
  listGasWallets() {
    return this.superAdminService.listGasWallets();
  }

  @UseGuards(SuperAdminGuard)
  @Get('wallets/gas')
  listGasWalletsAlias() {
    return this.superAdminService.listGasWallets();
  }

  @UseGuards(SuperAdminGuard)
  @Post('gas-wallets')
  upsertGasWallet(@Body() body: UpsertGasWalletDto) {
    return this.superAdminService.upsertGasWallet(body);
  }

  @UseGuards(SuperAdminGuard)
  @Post('wallets/gas')
  upsertGasWalletAlias(@Body() body: UpsertGasWalletDto) {
    return this.superAdminService.upsertGasWallet(body);
  }

  @UseGuards(SuperAdminGuard)
  @Post('gas-wallets/bootstrap')
  bootstrapGasWallets() {
    return this.superAdminService.bootstrapGasWallets();
  }

  @UseGuards(SuperAdminGuard)
  @Get('fee-wallets')
  listFeeWallets() {
    return this.superAdminService.listFeeWallets();
  }

  @UseGuards(SuperAdminGuard)
  @Get('wallets/fees')
  listFeeWalletsAlias() {
    return this.superAdminService.listFeeWallets();
  }

  @UseGuards(SuperAdminGuard)
  @Post('fee-wallets')
  upsertFeeWallet(@Body() body: UpsertFeeWalletDto) {
    return this.superAdminService.upsertFeeWallet(body);
  }

  @UseGuards(SuperAdminGuard)
  @Post('wallets/fees')
  upsertFeeWalletAlias(@Body() body: UpsertFeeWalletDto) {
    return this.superAdminService.upsertFeeWallet(body);
  }

  @UseGuards(SuperAdminGuard)
  @Post('fee-wallets/bootstrap')
  bootstrapFeeWallets() {
    return this.superAdminService.bootstrapFeeWallets();
  }

  @UseGuards(SuperAdminGuard)
  @Get('fee-wallets/balances')
  listFeeWalletBalances() {
    return this.superAdminService.getFeeWalletBalances();
  }

  @UseGuards(SuperAdminGuard)
  @Get('gas-wallets/balances')
  listGasWalletBalances() {
    return this.superAdminService.getGasWalletBalances();
  }

  @UseGuards(SuperAdminGuard)
  @Get('orders/payouts')
  listPayoutOrders(
    @Query('payoutStatus') payoutStatus?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.listOrdersForAdminPayouts({
      payoutStatus,
      limit: Number(limit) || 50,
    });
  }

  @UseGuards(SuperAdminGuard)
  @Post('orders/:orderId/complete-payment')
  completePayoutPayment(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.ordersService.completePaymentAsAdmin(orderId);
  }

  @UseGuards(SuperAdminGuard)
  @Get('chat-knowledge')
  listChatKnowledge(@Query() query: ListSupportKnowledgeEntriesDto) {
    return this.customerChatService.listKnowledgeEntries(query);
  }

  @UseGuards(SuperAdminGuard)
  @Post('chat-knowledge')
  createChatKnowledge(@Body() body: CreateSupportKnowledgeEntryDto) {
    return this.customerChatService.createKnowledgeEntry(body);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('chat-knowledge/:entryId')
  updateChatKnowledge(
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() body: UpdateSupportKnowledgeEntryDto,
  ) {
    return this.customerChatService.updateKnowledgeEntry(entryId, body);
  }

  @UseGuards(SuperAdminGuard)
  @Delete('chat-knowledge/:entryId')
  deleteChatKnowledge(@Param('entryId', ParseUUIDPipe) entryId: string) {
    return this.customerChatService.deactivateKnowledgeEntry(entryId);
  }

  @UseGuards(SuperAdminGuard)
  @Post('chat-knowledge/import-batch')
  importChatKnowledgeBatch(@Body() body: ImportSupportKnowledgeBatchDto) {
    return this.customerChatService.importKnowledgeBatch(body);
  }
}
