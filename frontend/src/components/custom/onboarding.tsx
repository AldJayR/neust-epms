import { ArrowRight, Bell, BookOpen, Check, Sparkles } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { completeOnboardingFn } from "@/features/auth";
import type { AuthUser } from "@/lib/auth";

const STEP_KEYS = ["first", "second", "third", "fourth", "fifth"];

interface OnboardingProps {
	user: AuthUser | null;
}

export function Onboarding({ user }: OnboardingProps) {
	const [isOpen, setIsOpen] = React.useState(() => {
		return !!user && !user.hasCompletedOnboarding;
	});
	const [step, setStep] = React.useState(1);

	if (!isOpen || !user) return null;

	const handleClose = async () => {
		setIsOpen(false);
		try {
			await completeOnboardingFn();
		} catch (error) {
			console.error("Failed to persist onboarding state:", error);
		}
	};

	const stepsCount = 3;

	const nextStep = () => {
		if (step < stepsCount) {
			setStep(step + 1);
		} else {
			handleClose();
		}
	};

	const prevStep = () => {
		if (step > 1) {
			setStep(step - 1);
		}
	};

	const isFaculty = user.roleName === "Faculty";
	const isDirector = user.roleName === "Director";
	const isRET = user.roleName === "RET Chair";
	const isAdmin = user.roleName === "Super Admin";

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
		>
			<DialogContent className="sm:max-w-[480px] rounded-xl p-6 bg-background">
				<DialogHeader className="flex flex-col items-center text-center pb-2">
					<div className="size-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary mb-3">
						{step === 1 && <Sparkles className="size-6 animate-pulse" />}
						{step === 2 && <BookOpen className="size-6" />}
						{step === 3 && <Bell className="size-6" />}
					</div>
					<DialogTitle className="text-xl font-bold text-heading">
						{step === 1 && "Welcome to Extension Services Portal"}
						{step === 2 && `Getting Started as ${user.roleName}`}
						{step === 3 && "Stay Updated"}
					</DialogTitle>
					<DialogDescription className="text-sm font-light text-muted-foreground mt-1">
						Step {step} of {stepsCount}
					</DialogDescription>
				</DialogHeader>

				<div className="my-6 min-h-[140px] flex flex-col justify-center text-center">
					{step === 1 && (
						<div className="space-y-3">
							<p className="text-sm text-foreground leading-relaxed">
								NEUST Extension Project Monitoring System (EPMS) helps you
								streamline proposal submissions, track project implementation,
								and manage reporting workflows easily.
							</p>
							<p className="text-xs text-muted-foreground">
								Let's take a quick 1-minute tour to help you get familiarized.
							</p>
						</div>
					)}

					{step === 2 && (
						<div className="space-y-3">
							{isFaculty && (
								<p className="text-sm text-foreground leading-relaxed">
									As a{" "}
									<span className="font-semibold text-brand-primary">
										Faculty Member
									</span>
									, you can submit new project proposals, submit regular
									reporting documents.
								</p>
							)}
							{isDirector && (
								<p className="text-sm text-foreground leading-relaxed">
									As the{" "}
									<span className="font-semibold text-brand-primary">
										Director
									</span>
									, you can review proposals, manage active projects, upload
									Special Orders, upload MOAs, and monitor ongoing projects.
								</p>
							)}
							{isRET && (
								<p className="text-sm text-foreground leading-relaxed">
									As the{" "}
									<span className="font-semibold text-brand-primary">
										RET Chair
									</span>
									, you can endorse proposals from your college and monitor
									ongoing projects.
								</p>
							)}
							{isAdmin && (
								<p className="text-sm text-foreground leading-relaxed">
									As a{" "}
									<span className="font-semibold text-brand-primary">
										Super Admin
									</span>
									, you can manage user roles, view global activity logs, and
									configure system properties.
								</p>
							)}
							<p className="text-xs text-muted-foreground">
								Your dashboard is customized to show only what's relevant to
								your role.
							</p>
						</div>
					)}

					{step === 3 && (
						<div className="space-y-3">
							<p className="text-sm text-foreground leading-relaxed">
								Use the{" "}
								<span className="font-semibold text-brand-primary">
									Notification bell
								</span>{" "}
								at the top right to stay updated on proposal approvals, report
								deadlines, and feedback.
							</p>
							<p className="text-xs text-muted-foreground">
								You're all set! Enjoy a modern, seamless experience.
							</p>
						</div>
					)}
				</div>

				<div className="flex items-center justify-between gap-4 mt-6">
					<Button
						variant="ghost"
						onClick={prevStep}
						disabled={step === 1}
						className="h-9 px-4 text-sm font-medium"
					>
						Back
					</Button>

					<div className="flex gap-1">
						{STEP_KEYS.slice(0, stepsCount).map((key, idx) => (
							<div
								key={key}
								className={`size-1.5 rounded-full transition-all duration-300 ${
									step === idx + 1 ? "bg-brand-primary w-3" : "bg-muted"
								}`}
							/>
						))}
					</div>

					<Button
						onClick={nextStep}
						className="h-9 px-4 text-sm font-medium gap-1 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
					>
						{step === stepsCount ? (
							<>
								Finish <Check className="size-3.5" />
							</>
						) : (
							<>
								Next <ArrowRight className="size-3.5" />
							</>
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
