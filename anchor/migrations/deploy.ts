// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import { AnchorProvider, setProvider } from '@coral-xyz/anchor';

module.exports = async function (provider: AnchorProvider) {
  // Configure client to use the provider.
  setProvider(provider);

  // Add your deploy script here.
};
