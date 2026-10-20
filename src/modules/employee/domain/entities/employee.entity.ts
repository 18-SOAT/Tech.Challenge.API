import { IdGenerator } from '../../../../shared/domain/id-generator.js';
import { Email } from '../../../../shared/domain/value-objects/email.vo.js';
import { EmployeeRole } from '../enums/employee-role.enum.js';
import { EmployeeError } from '../errors/employee.error.js';

export class Employee {
  // `email` é o e-mail de login (vive no User): aqui é só leitura, para a resposta
  // mostrar quem é o funcionário sem o use case carregar o User à parte.
  private constructor(
    private readonly id: string,
    private readonly userId: string,
    private readonly name: string,
    private readonly email: Email,
    private role: EmployeeRole,
  ) {}

  // "Funcionário cadastrado": nasce ligado ao User (EMPLOYEE) criado junto, na
  // mesma transação (EmployeeRegistrationRepository).
  static create(input: {
    userId: string;
    name: string;
    email: Email;
    role: EmployeeRole;
  }): Employee {
    return new Employee(
      IdGenerator.generate(),
      input.userId,
      Employee.validName(input.name),
      input.email,
      input.role,
    );
  }

  static restore(props: {
    id: string;
    userId: string;
    name: string;
    email: string;
    role: EmployeeRole;
  }): Employee {
    return new Employee(
      props.id,
      props.userId,
      props.name,
      Email.create(props.email),
      props.role,
    );
  }

  // "Papel do funcionário alterado". A invariante "sempre resta um ADMIN" depende
  // dos OUTROS funcionários, que a entity não enxerga: quem chama informa quantos
  // ADMINs existem hoje (mesma ideia do hasher no User.verifyPassword).
  changeRole(role: EmployeeRole, adminCount: number): void {
    if (Employee.wouldLeaveNoAdmin(this.role, role, adminCount)) {
      throw EmployeeError.lastAdmin();
    }
    this.role = role;
  }

  // Exposta para o adapter repetir a checagem dentro da transação (ver
  // PrismaEmployeeRepository.changeRole): a regra continua escrita num lugar só.
  static wouldLeaveNoAdmin(
    from: EmployeeRole,
    to: EmployeeRole,
    adminCount: number,
  ): boolean {
    return (
      from === EmployeeRole.ADMIN &&
      to !== EmployeeRole.ADMIN &&
      adminCount <= 1
    );
  }

  private static validName(raw: string): string {
    const name = raw.trim();
    if (!name) throw EmployeeError.invalidName();
    return name;
  }

  get idValue(): string {
    return this.id;
  }

  get userIdValue(): string {
    return this.userId;
  }

  get nameValue(): string {
    return this.name;
  }

  get emailValue(): string {
    return this.email.value;
  }

  get roleValue(): EmployeeRole {
    return this.role;
  }
}
