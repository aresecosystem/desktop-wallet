/* eslint-disable @typescript-eslint/require-await */
import { Profile, ReadWriteWallet } from "@arkecosystem/platform-sdk-profiles";
import { BigNumber } from "@arkecosystem/platform-sdk-support";
import { act, renderHook } from "@testing-library/react-hooks";
import { createMemoryHistory } from "history";
import nock from "nock";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Route } from "react-router-dom";
import {
	env,
	fireEvent,
	getDefaultProfileId,
	render,
	RenderResult,
	renderWithRouter,
	syncFees,
	waitFor,
	within,
} from "testing-library";
import ipfsFixture from "tests/fixtures/coins/ark/devnet/transactions/ipfs.json";
import { getDefaultWalletId, getDefaultWalletMnemonic } from "utils/testing-library";

import { FormStep, ReviewStep, SendIpfs, SummaryStep } from "./";

const passphrase = getDefaultWalletMnemonic();
const fixtureProfileId = getDefaultProfileId();

const createTransactionMock = (wallet: ReadWriteWallet) =>
	// @ts-ignore
	jest.spyOn(wallet.transaction(), "transaction").mockReturnValue({
		id: () => ipfsFixture.data.id,
		sender: () => ipfsFixture.data.sender,
		recipient: () => ipfsFixture.data.recipient,
		amount: () => BigNumber.make(ipfsFixture.data.amount),
		fee: () => BigNumber.make(ipfsFixture.data.fee),
		data: () => ipfsFixture.data,
	});

let profile: Profile;
let wallet: ReadWriteWallet;

describe("SendIpfs", () => {
	beforeAll(async () => {
		profile = env.profiles().findById(fixtureProfileId);
		wallet = profile.wallets().findById("ac38fe6d-4b67-4ef1-85be-17c5f6841129");

		jest.spyOn(wallet, "isDelegate").mockImplementation(() => true);

		nock("https://dwallets.ark.io")
			.get("/api/transactions")
			.query({ address: "D8rr7B1d6TL6pf14LgMz4sKp1VBMs6YUYD" })
			.reply(200, require("tests/fixtures/coins/ark/devnet/transactions.json"))
			.get("/api/transactions/1e9b975eff66a731095876c3b6cbff14fd4dec3bb37a4127c46db3d69131067e")
			.reply(200, ipfsFixture);

		await syncFees();
	});

	it("should render form step", async () => {
		const { result: form } = renderHook(() => useForm());
		const { getByTestId, asFragment } = render(
			<FormProvider {...form.current}>
				<FormStep networks={[]} profile={profile} />
			</FormProvider>,
		);

		expect(getByTestId("SendIpfs__form-step")).toBeTruthy();
		expect(asFragment()).toMatchSnapshot();
	});

	it("should render review step", async () => {
		const { result: form } = renderHook(() =>
			useForm({
				defaultValues: {
					fee: (0.1 * 1e8).toFixed(0),
					hash: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
					senderAddress: wallet.address(),
				},
			}),
		);

		const { asFragment, container, getByTestId } = render(
			<FormProvider {...form.current}>
				<ReviewStep wallet={wallet} />
			</FormProvider>,
		);

		expect(getByTestId("SendIpfs__review-step")).toBeTruthy();
		expect(container).toHaveTextContent(wallet.network().name());
		expect(container).toHaveTextContent("D8rr7B…s6YUYD");
		expect(container).toHaveTextContent("QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

		expect(asFragment()).toMatchSnapshot();
	});

	it("should render summary step", async () => {
		const { result: form } = renderHook(() => useForm());

		const transaction = (await wallet.transactions()).findById(
			"1e9b975eff66a731095876c3b6cbff14fd4dec3bb37a4127c46db3d69131067e",
		);
		const { getByTestId, asFragment } = render(
			<FormProvider {...form.current}>
				<SummaryStep transaction={transaction!} />
			</FormProvider>,
		);

		expect(getByTestId("TransactionSuccessful")).toBeTruthy();
		expect(asFragment()).toMatchSnapshot();
	});

	it("should navigate between steps", async () => {
		const history = createMemoryHistory();
		const ipfsURL = `/profiles/${fixtureProfileId}/wallets/${wallet.id()}/send-ipfs`;

		history.push(ipfsURL);

		let rendered: RenderResult;

		await act(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/:walletId/send-ipfs">
					<SendIpfs />
				</Route>,
				{
					routes: [ipfsURL],
					history,
				},
			);

			await waitFor(() => expect(rendered.getByTestId(`SendIpfs__form-step`)).toBeTruthy());
		});

		const { getByTestId } = rendered!;

		await act(async () => {
			await waitFor(() =>
				expect(rendered.getByTestId("SelectNetworkInput__input")).toHaveValue(wallet.network().name()),
			);
			await waitFor(() => expect(rendered.getByTestId("SelectAddress__input")).toHaveValue(wallet.address()));

			// Hash
			fireEvent.input(getByTestId("Input__hash"), {
				target: { value: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco" },
			});
			expect(getByTestId("Input__hash")).toHaveValue("QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

			// Fee
			const fees = within(getByTestId("InputFee")).getAllByTestId("SelectionBarOption");
			fireEvent.click(fees[1]);
			await waitFor(() => expect(getByTestId("InputCurrency")).not.toHaveValue("0"));

			// Step 2
			fireEvent.click(getByTestId("SendIpfs__button--continue"));
			await waitFor(() => expect(getByTestId("SendIpfs__review-step")).toBeTruthy());

			// Step 3
			fireEvent.click(getByTestId("SendIpfs__button--continue"));
			await waitFor(() => expect(getByTestId("AuthenticationStep")).toBeTruthy());

			// Back to Step 2
			fireEvent.click(getByTestId("SendIpfs__button--back"));
			await waitFor(() => expect(getByTestId("SendIpfs__review-step")).toBeTruthy());

			// Step 3
			fireEvent.click(getByTestId("SendIpfs__button--continue"));
			await waitFor(() => expect(getByTestId("AuthenticationStep")).toBeTruthy());
			const passwordInput = getByTestId("AuthenticationStep__mnemonic");
			fireEvent.input(passwordInput, { target: { value: passphrase } });
			await waitFor(() => expect(passwordInput).toHaveValue(passphrase));
		});
	});

	it("should send an IPFS transaction and go back to wallet page", async () => {
		const history = createMemoryHistory();
		const ipfsURL = `/profiles/${fixtureProfileId}/wallets/${wallet.id()}/send-ipfs`;

		history.push(ipfsURL);

		let rendered: RenderResult;

		await act(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/:walletId/send-ipfs">
					<SendIpfs />
				</Route>,
				{
					routes: [ipfsURL],
					history,
				},
			);

			await waitFor(() => expect(rendered.getByTestId(`SendIpfs__form-step`)).toBeTruthy());
		});

		const { getByTestId } = rendered!;

		await act(async () => {
			await waitFor(() =>
				expect(rendered.getByTestId("SelectNetworkInput__input")).toHaveValue(wallet.network().name()),
			);
			await waitFor(() => expect(rendered.getByTestId("SelectAddress__input")).toHaveValue(wallet.address()));

			// Hash
			fireEvent.input(getByTestId("Input__hash"), {
				target: { value: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco" },
			});
			expect(getByTestId("Input__hash")).toHaveValue("QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

			// Fee
			const fees = within(getByTestId("InputFee")).getAllByTestId("SelectionBarOption");
			fireEvent.click(fees[1]);
			await waitFor(() => expect(getByTestId("InputCurrency")).not.toHaveValue("0"));

			// Step 2
			fireEvent.click(getByTestId("SendIpfs__button--continue"));
			await waitFor(() => expect(getByTestId("SendIpfs__review-step")).toBeTruthy());

			// Step 3
			fireEvent.click(getByTestId("SendIpfs__button--continue"));
			await waitFor(() => expect(getByTestId("AuthenticationStep")).toBeTruthy());

			// Step 3
			const passwordInput = getByTestId("AuthenticationStep__mnemonic");
			fireEvent.input(passwordInput, { target: { value: passphrase } });
			await waitFor(() => expect(passwordInput).toHaveValue(passphrase));

			// Step 4
			const signMock = jest
				.spyOn(wallet.transaction(), "signIpfs")
				.mockReturnValue(Promise.resolve(ipfsFixture.data.id));
			const broadcastMock = jest.spyOn(wallet.transaction(), "broadcast").mockImplementation();
			const transactionMock = createTransactionMock(wallet);

			fireEvent.click(getByTestId("SendIpfs__button--submit"));

			await waitFor(() => expect(getByTestId("TransactionSuccessful")).toBeTruthy());
			expect(getByTestId("TransactionSuccessful")).toHaveTextContent("1e9b975eff66a…db3d69131067");

			signMock.mockRestore();
			broadcastMock.mockRestore();
			transactionMock.mockRestore();

			await waitFor(() => expect(rendered.container).toMatchSnapshot());

			// Go back to wallet
			const historySpy = jest.spyOn(history, "push");
			fireEvent.click(getByTestId("SendIpfs__button--back-to-wallet"));
			expect(historySpy).toHaveBeenCalledWith(`/profiles/${profile.id()}/wallets/${wallet.id()}`);
			historySpy.mockRestore();

			await waitFor(() => expect(rendered.container).toMatchSnapshot());
		});
	});

	it("should error if wrong mnemonic", async () => {
		const history = createMemoryHistory();
		const ipfsURL = `/profiles/${fixtureProfileId}/wallets/${wallet.id()}/send-ipfs`;

		history.push(ipfsURL);

		let rendered: RenderResult;

		await act(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/:walletId/send-ipfs">
					<SendIpfs />
				</Route>,
				{
					routes: [ipfsURL],
					history,
				},
			);

			await waitFor(() => expect(rendered.getByTestId(`SendIpfs__form-step`)).toBeTruthy());
		});

		const { getByTestId } = rendered!;

		await act(async () => {
			// Hash
			fireEvent.input(getByTestId("Input__hash"), {
				target: { value: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco" },
			});
			expect(getByTestId("Input__hash")).toHaveValue("QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

			// Fee
			await waitFor(() => expect(getByTestId("InputCurrency")).not.toHaveValue("0"));
			const fees = within(getByTestId("InputFee")).getAllByTestId("SelectionBarOption");
			fireEvent.click(fees[1]);
			expect(getByTestId("InputCurrency")).not.toHaveValue("0");

			// Step 2
			fireEvent.click(getByTestId("SendIpfs__button--continue"));
			await waitFor(() => expect(getByTestId("SendIpfs__review-step")).toBeTruthy());

			// Step 3
			fireEvent.click(getByTestId("SendIpfs__button--continue"));
			await waitFor(() => expect(getByTestId("AuthenticationStep")).toBeTruthy());

			// Back to Step 2
			fireEvent.click(getByTestId("SendIpfs__button--back"));
			await waitFor(() => expect(getByTestId("SendIpfs__review-step")).toBeTruthy());

			// Step 3
			fireEvent.click(getByTestId("SendIpfs__button--continue"));
			await waitFor(() => expect(getByTestId("AuthenticationStep")).toBeTruthy());
			const passwordInput = getByTestId("AuthenticationStep__mnemonic");
			fireEvent.input(passwordInput, { target: { value: passphrase } });
			await waitFor(() => expect(passwordInput).toHaveValue(passphrase));

			// Step 5 (skip step 4 for now - ledger confirmation)
			const signMock = jest.spyOn(wallet.transaction(), "signIpfs").mockImplementation(() => {
				throw new Error("Signatory should be");
			});

			fireEvent.click(getByTestId("SendIpfs__button--submit"));

			await waitFor(() => expect(passwordInput).toHaveValue(""));
			await waitFor(() => {
				expect(getByTestId("Input-error")).toBeVisible();
			});

			signMock.mockRestore();

			await waitFor(() => expect(rendered.container).toMatchSnapshot());
		});
	});

	it("should show error step and go back", async () => {
		const history = createMemoryHistory();
		const ipfsURL = `/profiles/${fixtureProfileId}/wallets/${wallet.id()}/send-ipfs`;

		history.push(ipfsURL);

		let rendered: RenderResult;

		await act(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/wallets/:walletId/send-ipfs">
					<SendIpfs />
				</Route>,
				{
					routes: [ipfsURL],
					history,
				},
			);

			await waitFor(() => expect(rendered.getByTestId(`SendIpfs__form-step`)).toBeTruthy());
		});

		const { getByTestId } = rendered!;

		await act(async () => {
			// Hash
			fireEvent.input(getByTestId("Input__hash"), {
				target: { value: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco" },
			});
			expect(getByTestId("Input__hash")).toHaveValue("QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

			// Fee
			await waitFor(() => expect(getByTestId("InputCurrency")).not.toHaveValue("0"));
			const fees = within(getByTestId("InputFee")).getAllByTestId("SelectionBarOption");
			fireEvent.click(fees[1]);
			expect(getByTestId("InputCurrency")).not.toHaveValue("0");

			// Step 2
			fireEvent.click(getByTestId("SendIpfs__button--continue"));
			await waitFor(() => expect(getByTestId("SendIpfs__review-step")).toBeTruthy());

			// Step 3
			fireEvent.click(getByTestId("SendIpfs__button--continue"));
			await waitFor(() => expect(getByTestId("AuthenticationStep")).toBeTruthy());

			// Back to Step 2
			fireEvent.click(getByTestId("SendIpfs__button--back"));
			await waitFor(() => expect(getByTestId("SendIpfs__review-step")).toBeTruthy());

			// Step 3
			fireEvent.click(getByTestId("SendIpfs__button--continue"));
			await waitFor(() => expect(getByTestId("AuthenticationStep")).toBeTruthy());
			const passwordInput = getByTestId("AuthenticationStep__mnemonic");
			fireEvent.input(passwordInput, { target: { value: passphrase } });
			await waitFor(() => expect(passwordInput).toHaveValue(passphrase));

			// Step 5 (skip step 4 for now - ledger confirmation)
			const signMock = jest.spyOn(wallet.transaction(), "signIpfs").mockImplementation(() => {
				throw new Error();
			});

			const historyMock = jest.spyOn(history, "push").mockReturnValue();

			fireEvent.click(getByTestId("SendIpfs__button--submit"));

			await waitFor(() => expect(getByTestId("ErrorStep")).toBeInTheDocument());
			await waitFor(() => expect(getByTestId("ErrorStep__wallet-button")).toBeInTheDocument());
			await waitFor(() => expect(rendered.container).toMatchSnapshot());

			act(() => {
				fireEvent.click(getByTestId("ErrorStep__wallet-button"));
			});

			const walletDetailPage = `/profiles/${getDefaultProfileId()}/wallets/${getDefaultWalletId()}`;
			await waitFor(() => expect(historyMock).toHaveBeenCalledWith(walletDetailPage));
			signMock.mockRestore();
		});
	});

	it("should show an error if an invalid IPFS hash is entered", async () => {
		const history = createMemoryHistory();
		const ipfsURL = `/profiles/${fixtureProfileId}/wallets/${wallet.id()}/send-ipfs`;

		history.push(ipfsURL);

		const { container, getByTestId } = renderWithRouter(
			<Route path="/profiles/:profileId/wallets/:walletId/send-ipfs">
				<SendIpfs />
			</Route>,
			{
				routes: [ipfsURL],
				history,
			},
		);

		await act(async () => {
			fireEvent.input(getByTestId("Input__hash"), {
				target: { value: "invalid-ipfs-hash" },
			});

			expect(getByTestId("Input__hash")).toHaveValue("invalid-ipfs-hash");

			await waitFor(() => {
				expect(getByTestId("Input-error")).toBeVisible();
			});

			await waitFor(() => expect(container).toMatchSnapshot());
		});
	});

	it("should send an ipfs transaction with a multisig wallet", async () => {
		const isMultiSignatureSpy = jest.spyOn(wallet, "isMultiSignature").mockReturnValue(true);
		const multisignatureSpy = jest
			.spyOn(wallet, "multiSignature")
			.mockReturnValue({ min: 2, publicKeys: [wallet.publicKey()!, profile.wallets().last().publicKey()!] });

		const history = createMemoryHistory();
		const ipfsURL = `/profiles/${fixtureProfileId}/transactions/${wallet.id()}/ipfs`;

		history.push(ipfsURL);

		let rendered: RenderResult;

		await act(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/transactions/:walletId/ipfs">
					<SendIpfs />
				</Route>,
				{
					routes: [ipfsURL],
					history,
				},
			);

			await waitFor(() => expect(rendered.getByTestId(`SendIpfs__form-step`)).toBeTruthy());
		});

		const { getByTestId } = rendered!;

		await act(async () => {
			await waitFor(() =>
				expect(rendered.getByTestId("SelectNetworkInput__input")).toHaveValue(wallet.network().name()),
			);
			await waitFor(() => expect(rendered.getByTestId("SelectAddress__input")).toHaveValue(wallet.address()));

			// Hash
			fireEvent.input(getByTestId("Input__hash"), {
				target: { value: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco" },
			});
			expect(getByTestId("Input__hash")).toHaveValue("QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

			// Fee
			const fees = within(getByTestId("InputFee")).getAllByTestId("SelectionBarOption");
			fireEvent.click(fees[1]);
			await waitFor(() => expect(getByTestId("InputCurrency")).not.toHaveValue("0"));

			// Step 2
			fireEvent.click(getByTestId("SendIpfs__button--continue"));
			await waitFor(() => expect(getByTestId("SendIpfs__review-step")).toBeTruthy());

			// Step 4
			const signMock = jest
				.spyOn(wallet.transaction(), "signIpfs")
				.mockReturnValue(Promise.resolve(ipfsFixture.data.id));
			const broadcastMock = jest.spyOn(wallet.transaction(), "broadcast").mockImplementation();
			const transactionMock = createTransactionMock(wallet);

			fireEvent.click(getByTestId("SendIpfs__button--continue"));

			await waitFor(() => expect(getByTestId("TransactionSuccessful")).toBeTruthy());
			expect(getByTestId("TransactionSuccessful")).toHaveTextContent("1e9b975eff66a…db3d69131067");

			expect(signMock).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.anything(),
					fee: expect.any(String),
					from: "D8rr7B1d6TL6pf14LgMz4sKp1VBMs6YUYD",
					nonce: expect.any(String),
					sign: {
						multiSignature: {
							min: 2,
							publicKeys: [
								"03df6cd794a7d404db4f1b25816d8976d0e72c5177d17ac9b19a92703b62cdbbbc",
								"03af2feb4fc97301e16d6a877d5b135417e8f284d40fac0f84c09ca37f82886c51",
							],
						},
					},
				}),
			);

			signMock.mockRestore();
			broadcastMock.mockRestore();
			transactionMock.mockRestore();
		});

		multisignatureSpy.mockRestore();
		isMultiSignatureSpy.mockRestore();
	});

	it("should send a ipfs transfer with a ledger wallet", async () => {
		const isLedgerSpy = jest.spyOn(wallet, "isLedger").mockImplementation(() => true);
		const signTransactionSpy = jest
			.spyOn(wallet.coin().ledger(), "signTransaction")
			.mockImplementation(
				() =>
					new Promise((resolve) =>
						setTimeout(
							() =>
								resolve(
									"dd3f96466bc50077b01e441cd35eb3c5aabd83670d371c2be8cc772ed189a7315dd66e88bde275d89a3beb7ef85ef84a52ec4213f540481cd09ecf6d21e452bf",
								),
							300,
						),
					),
			);
		const broadcastMock = jest.spyOn(wallet.transaction(), "broadcast").mockImplementation();

		const history = createMemoryHistory();
		const ipfsURL = `/profiles/${fixtureProfileId}/transactions/${wallet.id()}/ipfs`;

		history.push(ipfsURL);

		let rendered: RenderResult;

		await act(async () => {
			rendered = renderWithRouter(
				<Route path="/profiles/:profileId/transactions/:walletId/ipfs">
					<SendIpfs />
				</Route>,
				{
					routes: [ipfsURL],
					history,
				},
			);

			await waitFor(() => expect(rendered.getByTestId(`SendIpfs__form-step`)).toBeTruthy());
		});

		const { getByTestId } = rendered!;

		await act(async () => {
			await waitFor(() =>
				expect(rendered.getByTestId("SelectNetworkInput__input")).toHaveValue(wallet.network().name()),
			);
			await waitFor(() => expect(rendered.getByTestId("SelectAddress__input")).toHaveValue(wallet.address()));

			// Hash
			fireEvent.input(getByTestId("Input__hash"), {
				target: { value: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco" },
			});
			expect(getByTestId("Input__hash")).toHaveValue("QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

			// Fee
			const fees = within(getByTestId("InputFee")).getAllByTestId("SelectionBarOption");
			fireEvent.click(fees[1]);
			await waitFor(() => expect(getByTestId("InputCurrency")).not.toHaveValue("0"));

			// Step 2
			fireEvent.click(getByTestId("SendIpfs__button--continue"));
			await waitFor(() => expect(getByTestId("SendIpfs__review-step")).toBeTruthy());

			// Step 3
			expect(getByTestId("SendIpfs__button--continue")).not.toBeDisabled();
			fireEvent.click(getByTestId("SendIpfs__button--continue"));

			// Auto broadcast
			await waitFor(() => expect(getByTestId("LedgerConfirmation-description")).toBeInTheDocument());
			await waitFor(() => expect(getByTestId("TransactionSuccessful")).toBeTruthy());

			expect(getByTestId("TransactionSuccessful")).toHaveTextContent("81cb2fb05740c…8e896e9daff35");
		});

		broadcastMock.mockRestore();
		isLedgerSpy.mockRestore();
		signTransactionSpy.mockRestore();
	});
});
