/* eslint-disable @typescript-eslint/require-await */
import { Coins } from "@arkecosystem/platform-sdk";
import { Profile, ReadWriteWallet } from "@arkecosystem/platform-sdk-profiles";
import { BigNumber } from "@arkecosystem/platform-sdk-support";
import { act, renderHook } from "@testing-library/react-hooks";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { env, fireEvent, getDefaultProfileId, render, waitFor, within } from "utils/testing-library";

import { AddRecipient } from "./AddRecipient";

let profile: Profile;
let wallet: ReadWriteWallet;
let network: Coins.Network;

const renderWithFormProvider = async (children: any, defaultValues?: any) => {
	let rendered: any;

	const { result: form, waitForNextUpdate } = renderHook(() =>
		useForm({
			mode: "onChange",
			shouldUnregister: false,
			defaultValues: {
				...{ senderAddress: "D8rr7B1d6TL6pf14LgMz4sKp1VBMs6YUYD", network, fee: 0 },
				...defaultValues,
			},
		}),
	);

	await act(async () => {
		rendered = render(<FormProvider {...form.current}>{children}</FormProvider>);
	});

	return { ...rendered, form, waitForNextUpdate };
};

describe("AddRecipient", () => {
	beforeAll(async () => {
		profile = env.profiles().findById(getDefaultProfileId());
		wallet = profile.wallets().findByAddress("D8rr7B1d6TL6pf14LgMz4sKp1VBMs6YUYD") as ReadWriteWallet;
		network = wallet.network();
	});

	it("should render", async () => {
		const { container } = await renderWithFormProvider(
			<AddRecipient profile={profile} assetSymbol="ARK" maxAvailableAmount={BigNumber.make(80)} />,
		);

		// await waitFor(() => expect(getByTestId("SelectRecipient__input")).toHaveValue(""));
		expect(container).toMatchSnapshot();
	});

	it("should render without recipients", async () => {
		const { container } = await renderWithFormProvider(
			<AddRecipient maxAvailableAmount={BigNumber.ZERO} profile={profile} recipients={undefined} />,
		);
		expect(container).toMatchSnapshot();
	});

	it("should render with single recipient data", async () => {
		const values = {
			displayAmount: "1",
			amount: "100000000",
			recipientAddress: "D6Z26L69gdk9qYmTv5uzk3uGepigtHY4ax",
		};

		const { getByTestId, container } = await renderWithFormProvider(
			<AddRecipient maxAvailableAmount={BigNumber.ZERO} profile={profile} />,
			values,
		);

		await waitFor(() => {
			expect(getByTestId("AddRecipient__amount")).toHaveValue("1");
			expect(getByTestId("SelectRecipient__input")).toHaveValue("D6Z26L69gdk9qYmTv5uzk3uGepigtHY4ax");
		});

		expect(container).toMatchSnapshot();
	});

	it("should render with multiple recipients tab", async () => {
		const { getByTestId, container } = await renderWithFormProvider(
			<AddRecipient
				profile={profile}
				assetSymbol="ARK"
				maxAvailableAmount={BigNumber.make(80)}
				isSingleRecipient={false}
			/>,
		);

		await waitFor(() => expect(getByTestId("SelectRecipient__input")).toHaveValue(""));
		expect(container).toMatchSnapshot();
	});

	it("should render without the single & multiple tabs", async () => {
		const { container } = await renderWithFormProvider(
			<AddRecipient
				profile={profile}
				assetSymbol="ARK"
				maxAvailableAmount={BigNumber.make(80)}
				isSingleRecipient={true}
				showMultiPaymentOption={false}
			/>,
		);

		expect(container).toMatchSnapshot();
	});

	it("should set amount", async () => {
		const onChange = jest.fn();

		const { getByTestId, form } = await renderWithFormProvider(
			<AddRecipient
				profile={profile}
				assetSymbol="ARK"
				maxAvailableAmount={BigNumber.make(80)}
				onChange={onChange}
			/>,
		);

		await act(async () => {
			fireEvent.input(getByTestId("AddRecipient__amount"), {
				target: {
					value: "1",
				},
			});

			fireEvent.input(getByTestId("SelectRecipient__input"), {
				target: {
					value: "bP6T9GQ3kqP6T9GQ3kqP6T9GQ3kqTTTP6T9GQ3kqT",
				},
			});
		});

		await waitFor(() => {
			expect(form.current.getValues("amount")).toEqual("100000000");
			expect(getByTestId("SelectRecipient__input")).toHaveValue("bP6T9GQ3kqP6T9GQ3kqP6T9GQ3kqTTTP6T9GQ3kqT");
			expect(onChange).toHaveBeenCalledWith([
				{ amount: expect.any(BigNumber), address: "bP6T9GQ3kqP6T9GQ3kqP6T9GQ3kqTTTP6T9GQ3kqT" },
			]);
		});
	});

	it("should select recipient", async () => {
		const { getByTestId, getAllByTestId } = await renderWithFormProvider(
			<AddRecipient profile={profile} assetSymbol="ARK" maxAvailableAmount={BigNumber.make(80)} />,
		);

		expect(() => getByTestId("modal__inner")).toThrow(/Unable to find an element by/);

		await act(async () => {
			fireEvent.click(getByTestId("SelectRecipient__select-recipient"));
		});

		await waitFor(() => expect(getByTestId("modal__inner")).toBeTruthy());

		const firstAddress = getAllByTestId("RecipientListItem__select-button")[0];
		await act(async () => {
			fireEvent.click(firstAddress);
		});

		expect(() => getByTestId("modal__inner")).toThrow(/Unable to find an element by/);

		const selectedAddressValue = profile.wallets().first().address();
		expect(getByTestId("SelectRecipient__input")).toHaveValue(selectedAddressValue);
	});

	it("should set available amount", async () => {
		const { getByTestId, container, form } = await renderWithFormProvider(
			<AddRecipient profile={profile} assetSymbol="ARK" maxAvailableAmount={BigNumber.make(8 * 1e8)} />,
		);

		const sendAll = getByTestId("AddRecipient__send-all");
		await act(async () => {
			fireEvent.click(sendAll);
		});

		await waitFor(() => expect(form.current.getValues("amount")).toEqual(wallet.balance().toString()));
		expect(container).toMatchSnapshot();
	});

	it("should show zero amount if wallet has zero or insufficient balance", async () => {
		const emptyProfile = env.profiles().create("Empty");
		emptyProfile.wallets().importByMnemonic("test test", "ARK", "ark.devnet");
		const { getByTestId, container, form } = await renderWithFormProvider(
			<AddRecipient profile={emptyProfile} assetSymbol="ARK" maxAvailableAmount={BigNumber.ZERO} />,
		);

		const sendAll = getByTestId("AddRecipient__send-all");
		await act(async () => {
			fireEvent.click(sendAll);
		});

		await waitFor(() => expect(form.current.getValues("amount")).toEqual("0"));
		expect(container).toMatchSnapshot();
	});

	it("should toggle between single and multiple recipients", async () => {
		const { getByTestId, queryByText } = await renderWithFormProvider(
			<AddRecipient profile={profile} assetSymbol="ARK" maxAvailableAmount={BigNumber.make(80)} />,
		);

		const singleButton = getByTestId("AddRecipient__single");
		const multipleButton = getByTestId("AddRecipient__multi");

		const recipientLabel = "Recipient #1";

		expect(queryByText(recipientLabel)).toBeFalsy();

		await act(async () => {
			fireEvent.click(multipleButton);
		});

		expect(queryByText(recipientLabel)).toBeTruthy();

		await act(async () => {
			fireEvent.click(singleButton);
		});

		expect(queryByText(recipientLabel)).toBeFalsy();
	});

	it("should prevent adding invalid recipient address", async () => {
		const values = {
			displayAmount: "1",
			amount: "100000000",
			recipientAddress: "bP6T9GQ3kqP6T9GQ3kqP6T9GQ3kqTTTP6T9GQ3kqT",
		};

		const { getByTestId, form } = await renderWithFormProvider(
			<AddRecipient
				profile={profile}
				assetSymbol="ARK"
				maxAvailableAmount={BigNumber.make(80)}
				isSingleRecipient={false}
			/>,
			values,
		);

		await act(async () => {
			fireEvent.input(getByTestId("AddRecipient__amount"), {
				target: {
					value: values.displayAmount,
				},
			});
			fireEvent.input(getByTestId("SelectRecipient__input"), {
				target: {
					value: values.recipientAddress,
				},
			});
		});

		await waitFor(() => {
			expect(form.current.getValues("amount")).toEqual(values.amount);
			expect(form.current.getValues("displayAmount")).toEqual(values.displayAmount);

			expect(getByTestId("AddRecipient__add-button")).toBeTruthy();
			expect(getByTestId("AddRecipient__add-button")).not.toBeDisabled();
		});

		await act(async () => {
			fireEvent.click(getByTestId("AddRecipient__add-button"));
		});

		await waitFor(() =>
			expect(() => getByTestId("recipient-list__recipient-list-item")).toThrow(/Unable to find an element by/),
		);
	});

	it("should disable recipient fields if network is not filled", async () => {
		const values = {
			displayAmount: "1",
			network: null,
		};

		const { getByTestId } = await renderWithFormProvider(
			<AddRecipient profile={profile} assetSymbol="ARK" maxAvailableAmount={BigNumber.make(80)} />,
			values,
		);

		await waitFor(() => {
			expect(getByTestId("SelectRecipient__input")).toBeDisabled();
			expect(getByTestId("AddRecipient__amount")).toBeDisabled();
		});
	});

	it("should disable recipient fields if sender address is not filled", async () => {
		const values = {
			displayAmount: "1",
			senderAddress: null,
		};

		const { getByTestId } = await renderWithFormProvider(
			<AddRecipient profile={profile} assetSymbol="ARK" maxAvailableAmount={BigNumber.make(80)} />,
			values,
		);

		await waitFor(() => {
			expect(getByTestId("SelectRecipient__input")).toBeDisabled();
			expect(getByTestId("AddRecipient__amount")).toBeDisabled();
		});
	});

	it("should show error for low balance", async () => {
		const { getByTestId, getAllByTestId, form } = await renderWithFormProvider(
			<AddRecipient profile={profile} assetSymbol="ARK" maxAvailableAmount={BigNumber.make(80)} />,
		);

		expect(() => getByTestId("modal__inner")).toThrow(/Unable to find an element by/);

		await act(async () => {
			fireEvent.click(getByTestId("SelectRecipient__select-recipient"));
		});

		await waitFor(() => {
			expect(getByTestId("modal__inner")).toBeTruthy();
		});

		const firstAddress = getAllByTestId("RecipientListItem__select-button")[0];

		await act(async () => {
			fireEvent.click(firstAddress);
		});

		await act(async () => {
			fireEvent.change(getByTestId("AddRecipient__amount"), {
				target: {
					value: "10000000000",
				},
			});
		});

		await waitFor(() => expect(form.current.formState.errors.amount).toBeDefined());
	});

	it("should show error for zero balance", async () => {
		const mockWalletBalance = jest.spyOn(wallet, "balance").mockReturnValue(BigNumber.ZERO);

		const { getByTestId, getAllByTestId, form } = await renderWithFormProvider(
			<AddRecipient
				profile={profile}
				assetSymbol="ARK"
				maxAvailableAmount={BigNumber.make(80)}
				isSingleRecipient={false}
			/>,
		);

		expect(() => getByTestId("modal__inner")).toThrow(/Unable to find an element by/);

		await act(async () => {
			fireEvent.click(getByTestId("SelectRecipient__select-recipient"));
		});

		await waitFor(() => {
			expect(getByTestId("modal__inner")).toBeTruthy();
		});

		const firstAddress = getAllByTestId("RecipientListItem__select-button")[0];

		await act(async () => {
			fireEvent.click(firstAddress);
		});

		await act(async () => {
			fireEvent.change(getByTestId("AddRecipient__amount"), {
				target: {
					value: "0.1",
				},
			});
		});

		await waitFor(() => expect(form.current.formState.errors.amount).toBeDefined());

		mockWalletBalance.mockRestore();
	});

	it("should show error for invalid address", async () => {
		const { getByTestId, getAllByTestId, form } = await renderWithFormProvider(
			<AddRecipient
				profile={profile}
				assetSymbol="ARK"
				maxAvailableAmount={BigNumber.make(80)}
				isSingleRecipient={false}
			/>,
		);

		expect(() => getByTestId("modal__inner")).toThrow(/Unable to find an element by/);

		await act(async () => {
			fireEvent.click(getByTestId("SelectRecipient__select-recipient"));
		});

		await waitFor(() => {
			expect(getByTestId("modal__inner")).toBeTruthy();
		});

		const firstAddress = getAllByTestId("RecipientListItem__select-button")[0];
		await act(async () => {
			fireEvent.click(firstAddress);
		});

		await act(async () => {
			fireEvent.change(getByTestId("SelectRecipient__input"), {
				target: {
					value: "abc",
				},
			});
		});

		await waitFor(() => expect(form.current.formState.errors.recipientAddress).toBeDefined());
	});

	it("should show add recipient button when recipient and amount are set in multipe tab", async () => {
		const values = {
			displayAmount: "1",
			amount: "100000000",
			recipientAddress: "DFJ5Z51F1euNNdRUQJKQVdG4h495LZkc6T",
		};

		const { getByTestId, getAllByTestId, form } = await renderWithFormProvider(
			<AddRecipient
				profile={profile}
				assetSymbol="ARK"
				maxAvailableAmount={BigNumber.make(80)}
				isSingleRecipient={false}
			/>,
			values,
		);

		expect(() => getByTestId("modal__inner")).toThrow(/Unable to find an element by/);

		await act(async () => {
			fireEvent.click(getByTestId("SelectRecipient__select-recipient"));
		});

		await waitFor(() => {
			expect(getByTestId("modal__inner")).toBeTruthy();
		});

		const firstAddress = getAllByTestId("RecipientListItem__select-button")[0];

		await act(async () => {
			fireEvent.click(firstAddress);
		});

		await act(async () => {
			fireEvent.change(getByTestId("AddRecipient__amount"), {
				target: {
					value: "1",
				},
			});
		});

		await waitFor(() => expect(form.current.getValues("amount")).toEqual(values.amount));
		await waitFor(() => expect(form.current.getValues("displayAmount")).toEqual(values.displayAmount));

		await act(async () => {
			fireEvent.input(getByTestId("SelectRecipient__input"), {
				target: {
					value: values.recipientAddress,
				},
			});
		});

		await waitFor(() => expect(form.current.getValues("recipientAddress")).toEqual(values.recipientAddress));

		await waitFor(() => expect(getByTestId("AddRecipient__add-button")).toBeTruthy());
	});

	it("should add and remove recipient in multiple tab", async () => {
		const values = {
			displayAmount: "1",
			amount: "100000000",
			recipientAddress: "DFJ5Z51F1euNNdRUQJKQVdG4h495LZkc6T",
		};

		const { getByTestId, getAllByTestId, form } = await renderWithFormProvider(
			<AddRecipient
				profile={profile}
				assetSymbol="ARK"
				maxAvailableAmount={BigNumber.make(80)}
				isSingleRecipient={false}
			/>,
			values,
		);

		expect(() => getByTestId("modal__inner")).toThrow(/Unable to find an element by/);

		await act(async () => {
			fireEvent.click(getByTestId("SelectRecipient__select-recipient"));
		});

		await waitFor(() => {
			expect(getByTestId("modal__inner")).toBeTruthy();
		});

		const firstAddress = getAllByTestId("RecipientListItem__select-button")[0];

		await act(async () => {
			fireEvent.click(firstAddress);
		});

		await act(async () => {
			fireEvent.change(getByTestId("AddRecipient__amount"), {
				target: {
					value: "1",
				},
			});
		});

		await waitFor(() => expect(form.current.getValues("amount")).toEqual(values.amount));
		await waitFor(() => expect(form.current.getValues("displayAmount")).toEqual(values.displayAmount));

		await act(async () => {
			fireEvent.input(getByTestId("SelectRecipient__input"), {
				target: {
					value: values.recipientAddress,
				},
			});
		});

		await act(async () => {
			await waitFor(() => expect(getByTestId("AddRecipient__add-button")).toBeTruthy());
			fireEvent.click(getByTestId("AddRecipient__add-button"));

			await waitFor(() => expect(form.current.getValues("recipientAddress")).toEqual(""));
			await waitFor(() => expect(form.current.getValues("amount")).toEqual(undefined));
		});

		const removeBtn = within(getAllByTestId("recipient-list__recipient-list-item")[0]).getAllByTestId(
			"recipient-list__remove-recipient",
		);
		expect(removeBtn[0]).toBeTruthy();

		await act(async () => {
			fireEvent.click(removeBtn[0]);
		});

		await waitFor(() =>
			expect(() => getAllByTestId("recipient-list__recipient-list-item")).toThrow(/Unable to find an element by/),
		);
	});
});
