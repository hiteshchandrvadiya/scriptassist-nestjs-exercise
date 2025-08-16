import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { AutoMap } from '@automapper/classes';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  @AutoMap()
  id: string;

  @Column()
  @AutoMap()
  title: string;

  @Column({ type: 'text', nullable: true })
  @AutoMap()
  description: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  @AutoMap(() => String)
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  @AutoMap(() => String)
  priority: TaskPriority;

  @Column({ name: 'due_date', nullable: true })
  @AutoMap(() => Date)
  dueDate: Date;

  @Column({ name: 'user_id' })
  @AutoMap()
  userId: string;

  @ManyToOne(() => User, (user) => user.tasks)
  @JoinColumn({ name: 'user_id' })
  @AutoMap(() => User)
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  @AutoMap(() => Date)
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @AutoMap(() => Date)
  updatedAt: Date;
} 