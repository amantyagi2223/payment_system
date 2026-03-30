import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';
import { SuperAdminMerchantService } from './super-admin-merchant.service';
import { AdminMerchantListDto } from './dto/admin-merchant-list.dto';
import { AdminUpdateMerchantDto } from './dto/admin-update-merchant.dto';

@UseGuards(SuperAdminGuard)
@Controller('admin/merchants')
export class SuperAdminMerchantController {
  constructor(private readonly service: SuperAdminMerchantService) {}

  @Get()
  list(@Query() query: AdminMerchantListDto) {
    return this.service.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: AdminUpdateMerchantDto) {
    return this.service.update(id, body);
  }

  @Patch(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.service.suspend(id);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}
