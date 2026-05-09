import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganisationsService } from './organisations.service';
import { OrganisationsController } from './organisations.controller';
import { Organisation } from '../auth/organisations/entities/organisation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organisation])],
  providers: [OrganisationsService],
  controllers: [OrganisationsController],
  exports: [OrganisationsService],
})
export class OrganisationsModule {}
