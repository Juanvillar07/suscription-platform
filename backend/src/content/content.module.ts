import { Module } from '@nestjs/common';
import { ActiveSubscriptionGuard } from '../common/guards';
import { ContentController } from './content.controller';

@Module({
  controllers: [ContentController],
  providers: [ActiveSubscriptionGuard],
})
export class ContentModule {}
