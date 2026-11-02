import { Module } from '@nestjs/common';
import {
  AdminShipmentsController,
  CustomerShipmentsController,
} from './shipments.controller';
import { ShipmentsService } from './shipments.service';

@Module({
  controllers: [AdminShipmentsController, CustomerShipmentsController],
  providers: [ShipmentsService],
})
export class ShipmentsModule {}
