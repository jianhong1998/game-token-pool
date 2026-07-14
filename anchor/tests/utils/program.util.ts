import * as anchor from '@anchor-lang/core';
import { APP_NAME } from '../constants';

export class ProgramUtil<T extends anchor.Idl> {
  private provider: anchor.AnchorProvider | undefined;
  private program: anchor.Program<T> | undefined;

  private init(): void {
    this.provider = anchor.AnchorProvider.env();
    anchor.setProvider(this.provider);
    this.program = anchor.workspace[APP_NAME] as anchor.Program<T>;
  }

  public async getProvider(): Promise<anchor.Provider> {
    if (!this.provider) this.init();
    if (!this.provider) throw new Error('Failed to get provider');
    return this.provider;
  }

  public async getProgram(): Promise<anchor.Program<T>> {
    if (!this.program) this.init();
    if (!this.program) throw new Error('Failed to init program');
    return this.program;
  }
}
