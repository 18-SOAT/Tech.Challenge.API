import type {
  Prisma,
  User as PrismaUser,
} from '../../../../generated/prisma/client.js';
import { User } from '../../domain/entities/user.entity.js';
import type { UserType } from '../../domain/enums/user-type.enum.js';

export class UserMapper {
  static toEntity(record: PrismaUser): User {
    return User.restore({
      id: record.id,
      email: record.email,
      hashedPassword: record.hashedPassword,
      type: record.type as UserType,
      active: record.active,
    });
  }

  static toObject(entity: User): Prisma.UserCreateInput {
    return {
      id: entity.idValue,
      email: entity.emailValue,
      emailCanonical: entity.emailCanonical,
      hashedPassword: entity.hashedPassword,
      type: entity.typeValue,
      active: entity.isActive,
    };
  }
}
