import { describe, expect, it } from 'bun:test';
import { Email } from '../../../../shared/domain/value-objects/email.vo.js';
import { CustomerError, CustomerErrorCode } from '../errors/customer.error.js';
import { Document } from '../value-objects/document.vo.js';
import { Phone } from '../value-objects/phone.vo.js';
import { Customer } from './customer.entity.js';

describe('Customer', () => {
  it('create gera id, vincula ao user e deixa o nome pra depois', () => {
    const customer = Customer.create({
      userId: 'user-1',
      document: Document.create('529.982.247-25'),
      email: Email.create('joao@oficina.com'),
      phone: Phone.create('(11) 98765-4321'),
    });

    expect(customer.idValue).toBeTruthy();
    expect(customer.userIdValue).toBe('user-1');
    expect(customer.nameValue).toBeNull();
  });

  it('create no balcão: sem login, com nome (trim) e sem telefone', () => {
    const customer = Customer.create({
      name: '  João Silva  ',
      document: Document.create('11.222.333/0001-81'),
      email: Email.create('joao@oficina.com'),
    });

    expect(customer.userIdValue).toBeNull();
    expect(customer.nameValue).toBe('João Silva');
    expect(customer.phoneValue).toBeNull();
  });

  it('create rejeita nome vazio', () => {
    expect(() =>
      Customer.create({
        name: '   ',
        document: Document.create('11222333000181'),
        email: Email.create('joao@oficina.com'),
      }),
    ).toThrow(
      expect.objectContaining({ code: CustomerErrorCode.INVALID_NAME }),
    );
  });

  it('restore reconstrói cliente sem login e sem telefone (cadastrado no balcão)', () => {
    const customer = Customer.restore({
      id: 'customer-1',
      userId: null,
      name: 'João Silva',
      document: '11222333000181',
      email: 'joao@oficina.com',
      phone: null,
    });

    expect(customer.idValue).toBe('customer-1');
    expect(customer.userIdValue).toBeNull();
    expect(customer.nameValue).toBe('João Silva');
    expect(customer.documentValue).toBe('11222333000181');
    expect(customer.emailValue).toBe('joao@oficina.com');
    expect(customer.phoneValue).toBeNull();
  });

  describe('update', () => {
    const make = () =>
      Customer.restore({
        id: 'customer-1',
        userId: null,
        name: 'João Silva',
        document: '52998224725',
        email: 'joao@oficina.com',
        phone: '11987654321',
      });

    it('altera só os campos informados e mantém o documento', () => {
      const customer = make();

      customer.update({
        name: 'João S.',
        email: Email.create('j@oficina.com'),
      });

      expect(customer.nameValue).toBe('João S.');
      expect(customer.emailValue).toBe('j@oficina.com');
      expect(customer.phoneValue).toBe('11987654321');
      expect(customer.documentValue).toBe('52998224725');
    });

    it('phone null remove o telefone', () => {
      const customer = make();

      customer.update({ phone: null });

      expect(customer.phoneValue).toBeNull();
    });

    it('rejeita nome vazio sem alterar nada', () => {
      const customer = make();

      expect(() => customer.update({ name: '' })).toThrow(CustomerError);
      expect(customer.nameValue).toBe('João Silva');
    });
  });

  describe('assertCanBeRemoved', () => {
    it('permite excluir cliente sem login', () => {
      const customer = Customer.create({
        name: 'João',
        document: Document.create('52998224725'),
        email: Email.create('joao@oficina.com'),
      });

      expect(() => customer.assertCanBeRemoved()).not.toThrow();
    });

    it('bloqueia cliente com login vinculado', () => {
      const customer = Customer.create({
        userId: 'user-1',
        document: Document.create('52998224725'),
        email: Email.create('joao@oficina.com'),
      });

      expect(() => customer.assertCanBeRemoved()).toThrow(
        expect.objectContaining({ code: CustomerErrorCode.HAS_LINKED_ACCESS }),
      );
    });
  });
});
