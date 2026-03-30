import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { MerchantJwtAuthGuard } from '../auth/guards/merchant-jwt-auth.guard';

describe('InvoiceController', () => {
  let controller: InvoiceController;

  beforeEach(async () => {
    const allowGuard: CanActivate = {
      canActivate: () => true,
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        {
          provide: InvoiceService,
          useValue: {
            createInvoice: jest.fn(),
            listMerchantInvoices: jest.fn(),
            getInvoiceById: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(MerchantJwtAuthGuard)
      .useValue(allowGuard)
      .overrideGuard(ThrottlerGuard)
      .useValue(allowGuard);

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<InvoiceController>(InvoiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
