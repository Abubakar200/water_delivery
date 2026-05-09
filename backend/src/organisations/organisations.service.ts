import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Organisation } from '../auth/organisations/entities/organisation.entity';
import { CreateOrganisationDto, UpdateOrganisationDto } from './dto/organisation.dto';

@Injectable()
export class OrganisationsService {
  constructor(
    @InjectRepository(Organisation)
    private readonly orgRepo: Repository<Organisation>,
  ) {}

  async createOrganisation(dto: CreateOrganisationDto) {
    const existingOrg = await this.orgRepo.findOne({
      where: { slug: dto.slug },
    });

    if (existingOrg) {
      throw new ConflictException(`Organisation with slug '${dto.slug}' already exists`);
    }

    const org = this.orgRepo.create({
      name: dto.name,
      slug: dto.slug,
      logo: dto.logo,
      phone: dto.phone,
      address: dto.address,
    });

    await this.orgRepo.save(org);

    return {
      message: 'Organisation created successfully',
      organisation: this.sanitizeOrg(org),
    };
  }

  async getAllOrganisations() {
    const organisations = await this.orgRepo.find({
      where: { isActive: true },
    });

    return {
      total: organisations.length,
      organisations: organisations.map((org) => this.sanitizeOrg(org)),
    };
  }

  async getOrganisationById(orgId: number) {
    const org = await this.orgRepo.findOne({
      where: { id: orgId, isActive: true },
    });

    if (!org) {
      throw new NotFoundException(`Organisation with ID ${orgId} not found`);
    }

    return {
      organisation: this.sanitizeOrg(org),
    };
  }

  async updateOrganisation(orgId: number, dto: UpdateOrganisationDto) {
    const org = await this.orgRepo.findOne({
      where: { id: orgId, isActive: true },
    });

    if (!org) {
      throw new NotFoundException(`Organisation with ID ${orgId} not found`);
    }

    if (dto.slug && dto.slug !== org.slug) {
      const slugExists = await this.orgRepo.findOne({ where: { slug: dto.slug } });
      if (slugExists) {
        throw new ConflictException(`Slug '${dto.slug}' is already in use`);
      }
    }

    if (dto.name) org.name = dto.name;
    if (dto.slug) org.slug = dto.slug;
    if (dto.logo) org.logo = dto.logo;
    if (dto.phone) org.phone = dto.phone;
    if (dto.address) org.address = dto.address;

    await this.orgRepo.save(org);

    return {
      message: 'Organisation updated successfully',
      organisation: this.sanitizeOrg(org),
    };
  }

  async deleteOrganisation(orgId: number) {
    const org = await this.orgRepo.findOne({
      where: { id: orgId, isActive: true },
    });

    if (!org) {
      throw new NotFoundException(`Organisation with ID ${orgId} not found`);
    }

    org.isActive = false;
    await this.orgRepo.save(org);

    return {
      message: 'Organisation deleted successfully',
    };
  }

  private sanitizeOrg(org: Organisation) {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      phone: org.phone,
      address: org.address,
    };
  }
}
