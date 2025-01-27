import * as anchor from '@coral-xyz/anchor';
import { BankrunProvider } from 'anchor-bankrun';
import {
  AddedAccount,
  AddedProgram,
  ProgramTestContext,
  startAnchor,
} from 'solana-bankrun';
import IDL from '../../target/idl/gametokenpool.json';
import { APP_NAME } from '../constants';

export type IProgramUtilConstructorParams =
  | {
      isTestingOnChain: true;
    }
  | ({
      isTestingOnChain: false;
    } & Omit<IGenerateProgramUtilConstructorParams, 'isTestingOnChain'>);

export type IGenerateProgramUtilConstructorParams = {
  isTestingOnChain: boolean;
  anchorRootPath: string;
  addedPrograms: AddedProgram[];
  addedAccounts: AddedAccount[];
};

export class ProgramUtil<T extends anchor.Idl> {
  private addedPrograms: AddedProgram[];
  private addedAccounts: AddedAccount[];
  private anchorRootPath: string;
  private isTestingOnChain: boolean;

  private context: ProgramTestContext | undefined;
  private bankrunProvider: BankrunProvider | undefined;
  private anchorProvider: anchor.AnchorProvider | undefined;
  private program: anchor.Program<T> | undefined;

  constructor(params: IProgramUtilConstructorParams) {
    this.isTestingOnChain = params.isTestingOnChain;

    if (params.isTestingOnChain) {
      this.anchorRootPath = '';
      this.addedAccounts = [];
      this.addedPrograms = [];
    } else {
      this.addedAccounts = params.addedAccounts;
      this.addedPrograms = params.addedPrograms;
      this.anchorRootPath = params.anchorRootPath;
    }
  }

  private async init(): Promise<void> {
    if (this.isTestingOnChain) {
      this.anchorProvider = anchor.AnchorProvider.env();
      anchor.setProvider(this.anchorProvider);

      this.program = anchor.workspace[APP_NAME] as anchor.Program<T>;
      return;
    }

    this.context = await startAnchor(
      this.anchorRootPath,
      this.addedPrograms,
      this.addedAccounts
    );
    this.bankrunProvider = new BankrunProvider(this.context);
    this.program = new anchor.Program<T>(
      IDL as unknown as T,
      this.bankrunProvider
    );
  }

  public async getProvider(): Promise<anchor.Provider> {
    if (!this.anchorProvider && !this.bankrunProvider) await this.init();

    if (this.anchorProvider) return this.anchorProvider;
    if (this.bankrunProvider) return this.bankrunProvider;

    throw new Error('Failed to get provider');
  }

  public async getProgram(): Promise<anchor.Program<T>> {
    if (!this.program) await this.init();
    if (!this.program) throw new Error('Failed to init program');

    return this.program;
  }

  public async getContext(): Promise<ProgramTestContext | null> {
    if (!this.program) await this.init();
    return this.context ?? null;
  }

  public static generateConstructorParams(
    params: IGenerateProgramUtilConstructorParams
  ): IProgramUtilConstructorParams {
    const { addedAccounts, addedPrograms, anchorRootPath, isTestingOnChain } =
      params;

    if (isTestingOnChain) {
      return {
        isTestingOnChain,
      };
    }

    return {
      isTestingOnChain,
      addedAccounts,
      addedPrograms,
      anchorRootPath,
    };
  }
}
