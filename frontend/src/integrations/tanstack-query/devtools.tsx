import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";

const queryDevtoolsPlugin = {
	name: "Tanstack Query",
	render: <ReactQueryDevtoolsPanel />,
};

export default queryDevtoolsPlugin;
