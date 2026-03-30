"use client";

import { useState } from "react";

type Network = {
  id: string;
  name: string;
  chainId: number;
  isActive?: boolean;
};

type WalletFormProps = {
  networks: Network[];
  editingWallet?: {
    networkId: string;
    address: string;
    label?: string;
  } | null;
  action: (formData: FormData) => void;
};

export function WalletAddressForm({ networks, editingWallet, action }: WalletFormProps) {
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    editingWallet?.networkId ?? networks[0]?.id ?? ""
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    action(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
      <label className="text-sm text-slate-700">
        Network
        <select
          name="networkId"
          value={selectedNetworkId}
          onChange={(e) => setSelectedNetworkId(e.target.value)}
          required
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          {networks.length > 0 ? (
            networks.map((network) => (
              <option key={network.id} value={network.id}>
                {network.name} ({network.chainId})
              </option>
            ))
          ) : (
            <option value="">No active networks</option>
          )}
        </select>
      </label>

      <label className="text-sm text-slate-700">
        Wallet Address
        <input
          name="address"
          defaultValue={editingWallet?.address ?? ""}
          required
          placeholder="0x... (Ethereum) or T... (Tron)"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
      </label>

      <label className="text-sm text-slate-700">
        Label (Optional)
        <input
          name="label"
          maxLength={80}
          defaultValue={editingWallet?.label ?? ""}
          placeholder="Primary settlement wallet"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          {editingWallet ? "Update Wallet" : "Add Wallet"}
        </button>
        <a
          href="/merchant/wallets"
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
        >
          Reset
        </a>
      </div>
    </form>
  );
}

