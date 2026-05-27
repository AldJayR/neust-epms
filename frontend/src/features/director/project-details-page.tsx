import * as React from "react";
import {
	FileText,
	Download,
	History,
	ChevronRight,
	Eye,
	CheckCircle2,
	RotateCcw,
	User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

import { projectDetailsQueryOptions } from "@/lib/director.functions";
import { AppShell } from "../layout/app-shell";

interface ProjectDetailsPageProps {
	proposalId: string;
}

export function ProjectDetailsPage({ proposalId }: ProjectDetailsPageProps) {
	const { data, isLoading } = useQuery(projectDetailsQueryOptions(proposalId));

	if (isLoading) {
		return (
			<AppShell>
				<div className="flex h-[400px] items-center justify-center">
					<div className="size-8 animate-spin rounded-full border-4 border-[#14369c] border-t-transparent" />
				</div>
			</AppShell>
		);
	}

	if (!data) {
		return (
			<AppShell>
				<div className="flex h-[400px] items-center justify-center text-muted-foreground">
					Project not found.
				</div>
			</AppShell>
		);
	}

	return (
		<AppShell>
			<div className="flex flex-col gap-6">
				{/* Header Section */}
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-3">
							<Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1 font-semibold uppercase tracking-wider text-[10px]">
								{data.status}
							</Badge>
							<span className="text-sm font-medium text-[#666]">Version {data.version}</span>
						</div>
						<h1 className="text-[28px] font-bold leading-tight text-[#11215a]">
							{data.title}
						</h1>
					</div>
					<Button className="flex w-fit items-center gap-2 rounded-xl bg-[#14369c] px-6 py-6 text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">
						<Eye className="size-5" />
						<span className="text-base font-semibold">Read Proposal Document</span>
					</Button>
				</div>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
					{/* Main Column - Left */}
					<div className="lg:col-span-8 flex flex-col gap-6">
						{/* Vital Specs Card - List Group Style */}
						<Card className="overflow-hidden border-[#ebebeb] shadow-sm rounded-2xl">
							<CardHeader className="bg-[#fcfcfc] border-b border-[#ebebeb] px-6 py-4">
								<CardTitle className="text-lg font-bold text-[#11215a]">Project Overview</CardTitle>
							</CardHeader>
							<CardContent className="p-0">
								<div className="divide-y divide-[#ebebeb]">
									<div className="flex items-center justify-between px-6 py-4">
										<span className="text-[14px] font-medium text-[#666]">Project Leader</span>
										<div className="flex items-center gap-3">
											<Avatar className="size-8 border border-[#ebebeb]">
												<AvatarImage src={data.metadata.leader.avatarUrl} />
												<AvatarFallback className="bg-[#14369c]/10 text-[#14369c] text-xs">
													{data.metadata.leader.name.split(' ').map(n => n[0]).join('')}
												</AvatarFallback>
											</Avatar>
											<span className="text-[15px] font-semibold text-[#0a0a0a]">{data.metadata.leader.name}</span>
										</div>
									</div>
									<div className="flex items-center justify-between px-6 py-4">
										<span className="text-[14px] font-medium text-[#666]">Department / Unit</span>
										<span className="text-[15px] font-semibold text-[#0a0a0a]">{data.metadata.department}</span>
									</div>
									<div className="flex items-center justify-between px-6 py-4">
										<span className="text-[14px] font-medium text-[#666]">Duration</span>
										<span className="text-[15px] font-semibold text-[#0a0a0a]">{data.metadata.duration}</span>
									</div>
									<div className="flex items-center justify-between px-6 py-4">
										<span className="text-[14px] font-medium text-[#666]">MOA Linked</span>
										<div className="flex items-center gap-2">
											<CheckCircle2 className="size-4 text-green-500" />
											<span className="text-[15px] font-semibold text-[#0a0a0a]">{data.metadata.moaLinked}</span>
										</div>
									</div>
									<div className="flex items-center justify-between px-6 py-4">
										<span className="text-[14px] font-medium text-[#666]">Total Budget</span>
										<div className="flex flex-col items-end">
											<span className="text-lg font-bold text-[#11215a]">₱{data.metadata.budget.total.toLocaleString()}</span>
											<span className="text-[11px] text-[#666]">NEUST: ₱{data.metadata.budget.neust.toLocaleString()} | Partner: ₱{data.metadata.budget.partner.toLocaleString()}</span>
										</div>
									</div>
									
									{/* Team Members Trigger */}
									<Dialog>
										<DialogTrigger asChild>
											<button className="flex w-full items-center justify-between px-6 py-5 transition-colors hover:bg-[#fcfcfc]">
												<span className="text-[14px] font-medium text-[#666]">Project Team</span>
												<div className="flex items-center gap-4">
													<div className="flex -space-x-3">
														{data.members.slice(0, 4).map((member, i) => (
															<Avatar key={member.userId} className="size-9 border-2 border-white ring-1 ring-[#ebebeb]">
																<AvatarImage src={member.avatarUrl} />
																<AvatarFallback className="bg-gray-100 text-gray-600 text-[10px]">
																	{member.name.split(' ').map(n => n[0]).join('')}
																</AvatarFallback>
															</Avatar>
														))}
														{data.members.length > 4 && (
															<div className="flex size-9 items-center justify-center rounded-full border-2 border-white bg-gray-50 text-[10px] font-bold text-[#666] ring-1 ring-[#ebebeb]">
																+{data.members.length - 4}
															</div>
														)}
													</div>
													<ChevronRight className="size-5 text-[#999]" />
												</div>
											</button>
										</DialogTrigger>
										<DialogContent className="sm:max-w-[425px] rounded-3xl p-6">
											<DialogHeader className="pb-4">
												<DialogTitle className="text-xl font-bold text-[#11215a]">Project Members</DialogTitle>
											</DialogHeader>
											<div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-2">
												{data.members.map((member) => (
													<div key={member.userId} className="flex items-center gap-4 p-3 rounded-2xl transition-colors hover:bg-gray-50">
														<Avatar className="size-11 border border-[#ebebeb]">
															<AvatarImage src={member.avatarUrl} />
															<AvatarFallback className="bg-gray-100 text-gray-600">
																<User className="size-5" />
															</AvatarFallback>
														</Avatar>
														<div className="flex flex-col">
															<span className="font-bold text-[#0a0a0a] text-sm">{member.name}</span>
															<span className="text-xs text-[#666]">{member.role}</span>
														</div>
													</div>
												))}
											</div>
										</DialogContent>
									</Dialog>
								</div>
							</CardContent>
						</Card>

						{/* History Timeline */}
						<Card className="border-[#ebebeb] shadow-sm rounded-2xl">
							<CardHeader className="px-6 py-4">
								<CardTitle className="text-lg font-bold text-[#11215a]">Document History</CardTitle>
							</CardHeader>
							<CardContent className="px-6 pb-6">
								<div className="relative space-y-8 before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-[#ebebeb]">
									{data.history.map((item, idx) => (
										<div key={item.id} className="relative flex items-start gap-6 pl-10">
											<div className={`absolute left-0 mt-1.5 size-[24px] rounded-full border-4 border-white shadow-sm ring-1 ring-[#ebebeb] ${idx === 0 ? 'bg-[#14369c]' : 'bg-white'}`} />
											<div className="flex flex-1 flex-col gap-2">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3">
														<span className="font-bold text-[#0a0a0a]">Version {item.version}</span>
														<Badge className={`${
															item.status === 'Current' ? 'bg-blue-50 text-blue-600 border-blue-100' :
															item.status === 'Returned' ? 'bg-red-50 text-red-600 border-red-100' :
															'bg-gray-50 text-gray-600 border-gray-100'
														} rounded-lg px-2 py-0 h-5 text-[10px] font-bold uppercase`}>
															{item.status}
														</Badge>
													</div>
													<span className="text-[12px] font-medium text-[#999]">{format(new Date(item.date), "MMM dd, yyyy · hh:mm a")}</span>
												</div>
												<p className="text-sm font-medium text-[#444]">
													{item.status === 'Returned' ? 'Returned by Technical Panel' : `Uploaded by ${item.actorName}`}
												</p>
												{item.comment && (
													<div className="rounded-xl border border-dashed border-[#ebebeb] bg-[#fcfcfc] p-3 text-xs italic text-[#737373]">
														“{item.comment}”
													</div>
												)}
												{item.status !== 'Current' && (
													<Button variant="outline" size="sm" className="w-fit gap-1.5 rounded-lg border-[#e5e5e5] h-8 text-[12px] font-semibold text-[#737373] shadow-sm hover:bg-white hover:text-[#0a0a0a]">
														<FileText className="size-3.5" />
														View Version
													</Button>
												)}
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Sidebar Column - Right */}
					<div className="lg:col-span-4 flex flex-col gap-6">
						{/* Attachments Card */}
						<Card className="border-[#ebebeb] shadow-sm rounded-2xl overflow-hidden">
							<CardHeader className="bg-[#fcfcfc] border-b border-[#ebebeb] px-6 py-4">
								<CardTitle className="text-lg font-bold text-[#11215a]">Attachments</CardTitle>
							</CardHeader>
							<CardContent className="p-4 flex flex-col gap-4">
								{data.attachments.map((attachment) => (
									<div key={attachment.id} className="group relative flex flex-col gap-3 rounded-2xl border border-[#ebebeb] bg-white p-4 transition-all hover:border-[#14369c]/30 hover:shadow-md">
										<div className="flex items-center gap-4">
											<div className="flex size-12 items-center justify-center rounded-xl bg-red-50 text-red-500 ring-1 ring-red-100">
												<FileText className="size-6" />
											</div>
											<div className="flex flex-1 flex-col overflow-hidden">
												<span className="truncate text-[14px] font-bold text-[#0a0a0a] group-hover:text-[#14369c]">
													{attachment.name}
												</span>
												<span className="text-[12px] text-[#999] uppercase font-bold">
													{attachment.type} · v{attachment.version}
												</span>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-2">
											<Button variant="outline" className="h-9 rounded-xl border-[#e5e5e5] text-xs font-bold text-[#737373] hover:bg-gray-50">
												<Eye className="mr-2 size-3.5" />
												View
											</Button>
											<Button variant="outline" className="h-9 rounded-xl border-[#e5e5e5] text-xs font-bold text-[#737373] hover:bg-gray-50">
												<Download className="mr-2 size-3.5" />
												Download
											</Button>
										</div>
									</div>
								))}
							</CardContent>
						</Card>

						{/* Workflow Actions Section */}
						<div className="flex flex-col gap-3 p-1">
							<Button className="w-full h-14 rounded-2xl bg-green-600 font-bold text-white shadow-lg transition-all hover:bg-green-700 hover:shadow-green-600/20 active:scale-[0.98]">
								<CheckCircle2 className="mr-2 size-5" />
								Approve Proposal
							</Button>
							<Button variant="outline" className="w-full h-14 rounded-2xl border-2 border-red-100 bg-white font-bold text-red-600 transition-all hover:bg-red-50 hover:border-red-200 active:scale-[0.98]">
								<RotateCcw className="mr-2 size-5" />
								Return for Revision
							</Button>
						</div>
					</div>
				</div>
			</div>
		</AppShell>
	);
}
