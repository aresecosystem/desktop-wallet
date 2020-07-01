import React from "react";
import { FormContext, FormContextValues, OnSubmit } from "react-hook-form";

type FormProps = {
	onSubmit: OnSubmit<Record<string, any>>;
	context: FormContextValues<any>;
} & React.FormHTMLAttributes<any>;

export const Form = React.forwardRef<HTMLFormElement, FormProps>(
	({ children, context, onSubmit, ...props }: FormProps, ref) => {
		return (
			<FormContext {...context}>
				<form
					data-testid="Form"
					ref={ref}
					className="space-y-8"
					onSubmit={context.handleSubmit(onSubmit)}
					{...props}
				>
					{children}
				</form>
			</FormContext>
		);
	},
);

Form.displayName = "Form";