import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganisationMember } from '../organisations/entities/organisation-member.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ select: false })   // never returned in queries by default
  password: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => OrganisationMember, (m) => m.user)
  memberships: OrganisationMember[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}