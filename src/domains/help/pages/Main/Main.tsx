import { Button } from "app/components/Button";
import { Circle } from "app/components/Circle";
import { Icon } from "app/components/Icon";
import React from "react";
import { useTranslation } from "react-i18next";

type ArticleListItemProps = {
	title: string;
	path: string;
};

type CategoryItemProps = {
	title?: string;
	subtitle?: string;
	path?: string;
	icon: string;
};

type SupportProps = {
	categories?: CategoryItemProps[];
	helpfulArticles?: ArticleListItemProps[];
	newestArticles?: ArticleListItemProps[];
	popularArticles?: ArticleListItemProps[];
};

const ArticleListItem = ({ title, path }: ArticleListItemProps) => (
	<li className="border-dotted cursor-pointer border-b-1 border-theme-neutral-300 last:border-b-0">
		<a
			title={title}
			href={path}
			className="flex px-2 py-4 -mx-3 rounded-md border-3 border-theme-background hover:bg-theme-neutral-100 text-theme-neutral-800 hover:text-theme-primary-600"
		>
			<div>
				<div className="pt-1 text-theme-neutral-800">
					<Icon name="Article" width={16} height={16} />
				</div>
			</div>
			<div className="ml-3">{title}</div>
		</a>
	</li>
);

const CategoryItem = ({ icon, title, subtitle, path }: CategoryItemProps) => (
	<a
		href={path}
		title={title}
		className="flex flex-row w-64 cursor-pointer border-r-1 last:border-r-0 border-theme-neutral-200"
	>
		<div className="flex flex-row w-full p-5 mx-2 bg-white px-7 rounded-md hover:shadow-xl">
			<div className="w-2/5 my-auto">
				<Circle className="border-theme-neutral-800" size="large">
					<div className="text-theme-neutral-800">
						<Icon name={icon} width={20} height={20} />
					</div>
				</Circle>
			</div>
			<div className="flex-auto my-auto">
				<div className="font-bold text-theme-neutral-800">{title}</div>
				<div className="text-sm text-theme-neutral-500">{subtitle}</div>
			</div>
		</div>
	</a>
);

export const Main = ({ categories, helpfulArticles, popularArticles, newestArticles }: SupportProps) => {
	const { t } = useTranslation();
	return (
		<div className="bg-theme-neutral-100">
			<div className="mb-5 bg-white p-13">
				<div className="flex">
					<div className="w-2/3">
						<h1>{t("HELP.PAGE_SUPPORT.TITLE")}</h1>
						<p className="text-theme-neutral-600">{t("HELP.PAGE_SUPPORT.SUBTITLE")}</p>
					</div>
					<div className="flex justify-end w-1/3">
						<div className="my-auto cursor-pointer text-theme-primary-200">
							<Icon name="Search" />
						</div>
						<div className="h-8 mx-10 my-auto border-l border-1 border-theme-primary-100" />
						<div className="my-auto">
							<Button color="primary">{t("HELP.CONTACT_US")}</Button>
						</div>
					</div>
				</div>
			</div>
			<div className="mb-5 bg-white p-13">
				<div className="flex flex-row">
					{categories &&
						categories.map((category: CategoryItemProps, index: number) => {
							return (
								<CategoryItem
									title={category.title}
									subtitle={category.subtitle}
									icon={category.icon}
									key={index}
								/>
							);
						})}
				</div>
			</div>
			<div className="py-10 mb-10 bg-white px-14">
				<div className="flex flex-row">
					<div className="w-1/3 mr-10">
						<h3>{t("HELP.PAGE_SUPPORT.CATEGORIES.HELPFUL")}</h3>
						<ul>
							{helpfulArticles &&
								helpfulArticles.map(({ title, path }: ArticleListItemProps, index: number) => (
									<ArticleListItem title={title} path={path} key={index} />
								))}
						</ul>
					</div>
					<div className="w-1/3 mr-10">
						<h3>{t("HELP.PAGE_SUPPORT.CATEGORIES.POPULAR")}</h3>
						<ul>
							{popularArticles &&
								popularArticles.map(({ title, path }: ArticleListItemProps, index: number) => (
									<ArticleListItem title={title} path={path} key={index} />
								))}
						</ul>
					</div>
					<div className="w-1/3 mr-10">
						<h3>{t("HELP.PAGE_SUPPORT.CATEGORIES.NEWEST")}</h3>
						<ul>
							{newestArticles &&
								newestArticles.map(({ title, path }: ArticleListItemProps, index: number) => (
									<ArticleListItem title={title} path={path} key={index} />
								))}
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
};