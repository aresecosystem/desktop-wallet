import React from "react";
import { fireEvent, render, screen } from "utils/testing-library";

import { PluginGrid } from "./PluginGrid";

const plugins = [
	{
		id: "ark-explorer",
		title: "ARK Explorer",
		author: "ARK.io",
		category: "utility",
		version: "1.3.8",
		size: "4.2 MB",
		isInstalled: false,
		isOfficial: true,
	},
	{
		id: "ark-avatars",
		title: "ARK Avatars",
		author: "ARK.io",
		category: "other",
		version: "1.3.8",
		size: "163 KB",
		isInstalled: true,
		isGrant: true,
	},
	{
		id: "ark-theme",
		title: "ARK Theme",
		author: "ARK.io",
		category: "other",
		version: "1.3.8",
		size: "163 KB",
		isInstalled: true,
		isEnabled: true,
		isGrant: true,
	},
];

describe("PluginGrid", () => {
	it("should render pagination", async () => {
		const morePlugins = [
			{
				id: "drakula-theme",
				title: "Drakula Theme",
				author: "Breno Polanski",
				category: "other",
				version: "1.3.8",
				size: "163 KB",
				isInstalled: true,
				isEnabled: true,
				isGrant: true,
			},
			{
				id: "avfc-theme",
				title: "Avfc Theme",
				author: "ARK.io",
				category: "other",
				version: "1.3.8",
				size: "163 KB",
				isInstalled: true,
				isEnabled: true,
				isGrant: true,
			},
			{
				id: "red-snow-theme",
				title: "Red snow theme",
				author: "ARK.io",
				category: "other",
				version: "1.3.8",
				size: "163 KB",
				isInstalled: true,
				isEnabled: true,
				isGrant: true,
			},
		];
		const { asFragment, findByText, getByTestId } = render(
			<PluginGrid itemsPerPage={4} plugins={[...plugins, ...morePlugins]} />,
		);

		for (const plugin of plugins) {
			expect(await findByText(plugin.title)).toBeTruthy();
		}

		expect(getByTestId("Pagination")).toBeTruthy();
		expect(asFragment()).toMatchSnapshot();
	});

	it("shouldn't render pagination", async () => {
		const { asFragment, findByText, getByTestId } = render(<PluginGrid plugins={plugins} />);

		for (const plugin of plugins) {
			expect(await findByText(plugin.title)).toBeTruthy();
		}

		expect(() => getByTestId("Pagination")).toThrow(/Unable to find an element by/);
		expect(asFragment()).toMatchSnapshot();
	});

	it("should render skeletons", () => {
		const { asFragment, findByText, getAllByTestId } = render(<PluginGrid isLoading plugins={[]} />);

		expect(getAllByTestId("PluginCardSkeleton")).toHaveLength(8);
		expect(asFragment()).toMatchSnapshot();
	});

	it("should render custom number of skeletons", () => {
		const { asFragment, getAllByTestId } = render(<PluginGrid isLoading skeletonsLimit={10} plugins={[]} />);

		expect(getAllByTestId("PluginCardSkeleton")).toHaveLength(10);
		expect(asFragment()).toMatchSnapshot();
	});

	it("should render without pagination", async () => {
		const { asFragment, findByText, getByTestId } = render(<PluginGrid plugins={plugins} withPagination={false} />);

		for (const plugin of plugins) {
			expect(await findByText(plugin.title)).toBeTruthy();
		}

		expect(() => getByTestId("Pagination")).toThrow(/Unable to find an element by/);
		expect(asFragment()).toMatchSnapshot();
	});

	it("should split by page", async () => {
		const { asFragment, findByText, getByTestId } = render(<PluginGrid plugins={plugins} itemsPerPage={1} />);

		expect(await findByText(plugins[0].title)).toBeTruthy();
		await expect(findByText(plugins[1].title)).rejects.toThrow();

		fireEvent.click(getByTestId("Pagination__next"));

		expect(await findByText(plugins[1].title)).toBeTruthy();
		await expect(findByText(plugins[0].title)).rejects.toThrow();

		expect(asFragment()).toMatchSnapshot();
	});

	it("should trigger select", async () => {
		const onSelect = jest.fn();

		const { findByText } = render(<PluginGrid plugins={plugins} onSelect={onSelect} />);

		fireEvent.click(await findByText(plugins[0].title));

		expect(onSelect).toHaveBeenCalledTimes(1);
	});

	it("should trigger delete", () => {
		const onDelete = jest.fn();

		render(<PluginGrid plugins={plugins} onSelect={jest.fn()} onDelete={onDelete} />);

		fireEvent.click(screen.queryAllByTestId("dropdown__toggle")[1]);
		fireEvent.click(screen.getByTestId("dropdown__option--0"));

		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	it("should trigger enable", () => {
		const onEnable = jest.fn();

		render(<PluginGrid plugins={plugins} onSelect={jest.fn()} onEnable={onEnable} />);

		fireEvent.click(screen.queryAllByTestId("dropdown__toggle")[1]);
		fireEvent.click(screen.getByTestId("dropdown__option--1"));

		expect(onEnable).toHaveBeenCalledTimes(1);
	});

	it("should trigger disable", () => {
		const onDisable = jest.fn();

		render(<PluginGrid plugins={plugins} onSelect={jest.fn()} onDisable={onDisable} />);

		fireEvent.click(screen.queryAllByTestId("dropdown__toggle")[2]);
		fireEvent.click(screen.getByTestId("dropdown__option--1"));

		expect(onDisable).toHaveBeenCalledTimes(1);
	});

	it("should trigger install", () => {
		const onInstall = jest.fn();

		render(<PluginGrid plugins={plugins} onSelect={jest.fn()} onInstall={onInstall} />);

		fireEvent.click(screen.queryAllByTestId("dropdown__toggle")[0]);
		fireEvent.click(screen.getByTestId("dropdown__option--0"));

		expect(onInstall).toHaveBeenCalledTimes(1);
	});

	it("should trigger launch", () => {
		const onLaunch = jest.fn();

		render(
			<PluginGrid
				plugins={[{ ...plugins[0], isInstalled: true, hasLaunch: true }]}
				onSelect={jest.fn()}
				onLaunch={onLaunch}
			/>,
		);

		fireEvent.click(screen.queryAllByTestId("dropdown__toggle")[0]);
		fireEvent.click(screen.getByTestId("dropdown__option--2"));

		expect(onLaunch).toHaveBeenCalledTimes(1);
	});
});
