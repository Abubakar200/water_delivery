import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrganisationMember } from './organisation-member.entity';

@Entity('organisations')
export class Organisation {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 150, unique: true })
  slug: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => OrganisationMember, (m) => m.organisation)
  members: OrganisationMember[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}