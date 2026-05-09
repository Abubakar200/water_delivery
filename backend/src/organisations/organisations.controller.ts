import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { OrganisationsService } from './organisations.service';
import { CreateOrganisationDto, UpdateOrganisationDto } from './dto/organisation.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';

@Controller('organisations')
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOrganisation(@Body() dto: CreateOrganisationDto) {
    return this.organisationsService.createOrganisation(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getAllOrganisations() {
    return this.organisationsService.getAllOrganisations();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getOrganisationById(@Param('id', ParseIntPipe) orgId: number) {
    return this.organisationsService.getOrganisationById(orgId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateOrganisation(
    @Param('id', ParseIntPipe) orgId: number,
    @Body() dto: UpdateOrganisationDto,
  ) {
    return this.organisationsService.updateOrganisation(orgId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteOrganisation(@Param('id', ParseIntPipe) orgId: number) {
    return this.organisationsService.deleteOrganisation(orgId);
  }
}
