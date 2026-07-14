import { Camera, Laptop, Moon, Settings2, Sun, UserRound } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { changePasswordFn, updateProfileFn } from "@/features/auth";
import { uploadAvatarFn } from "@/features/settings/functions";
import type { AuthUser } from "@/lib/auth";

interface SettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: AuthUser | null;
	onUserUpdated?: (user: AuthUser) => void;
}

type ProfileState = {
	firstName: string;
	middleName: string;
	lastName: string;
	nameSuffix: string;
	academicRank: string;
};

const themeOptions = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Laptop },
] as const;

function getProfileState(user: AuthUser): ProfileState {
	return {
		firstName: user.firstName,
		middleName: user.middleName ?? "",
		lastName: user.lastName,
		nameSuffix: user.nameSuffix ?? "",
		academicRank: user.academicRank ?? "",
	};
}

export function SettingsDialog({
	open,
	onOpenChange,
	user,
	onUserUpdated,
}: SettingsDialogProps) {
	const { theme, setTheme } = useTheme();
	const [profile, setProfile] = React.useState<ProfileState | null>(
		user ? getProfileState(user) : null,
	);
	const [password, setPassword] = React.useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});
	const [savingProfile, setSavingProfile] = React.useState(false);
	const [savingPassword, setSavingPassword] = React.useState(false);
	const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
	const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
	const avatarInputRef = React.useRef<HTMLInputElement>(null);

	// Object URLs are browser resources, so this effect revokes them on replacement/unmount.
	React.useEffect(() => {
		if (!avatarFile) {
			setAvatarPreview(null);
			return;
		}
		const previewUrl = URL.createObjectURL(avatarFile);
		setAvatarPreview(previewUrl);
		return () => URL.revokeObjectURL(previewUrl);
	}, [avatarFile]);

	if (!user || !profile) return null;

	const updateProfileField = (field: keyof ProfileState, value: string) => {
		setProfile((current) =>
			current ? { ...current, [field]: value } : current,
		);
	};

	const saveProfile = async () => {
		setSavingProfile(true);
		try {
			const updatedUser = await updateProfileFn({
				data: {
					...profile,
					middleName: profile.middleName || null,
					nameSuffix: profile.nameSuffix || null,
					academicRank: profile.academicRank || null,
				},
			});
			onUserUpdated?.(updatedUser);
			toast.success("Profile updated");
			setSavingProfile(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to update profile",
			);
			setSavingProfile(false);
		}
	};

	const uploadAvatar = async () => {
		if (!avatarFile) return;
		setUploadingAvatar(true);
		try {
			const formData = new FormData();
			formData.append("file", avatarFile);
			const result = await uploadAvatarFn({ data: formData });
			onUserUpdated?.({ ...user, avatarUrl: result.avatarUrl });
			setAvatarFile(null);
			if (avatarInputRef.current) avatarInputRef.current.value = "";
			toast.success("Avatar updated");
			setUploadingAvatar(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to upload avatar",
			);
			setUploadingAvatar(false);
		}
	};

	const initials =
		`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

	const savePassword = async () => {
		if (password.newPassword !== password.confirmPassword) {
			toast.error("New passwords do not match");
			return;
		}

		setSavingPassword(true);
		try {
			await changePasswordFn({
				data: {
					currentPassword: password.currentPassword,
					newPassword: password.newPassword,
				},
			});
			setPassword({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
			toast.success("Password changed");
			setSavingPassword(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to change password",
			);
			setSavingPassword(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[min(640px,calc(100vh-2rem))] w-[calc(100vw-2rem)] !max-w-[760px] flex-col gap-0 overflow-hidden p-0">
				<DialogHeader className="shrink-0 border-b border-border px-6 py-5 pr-12">
					<DialogTitle className="text-lg">Settings</DialogTitle>
					<DialogDescription>
						Manage your appearance, profile details, and password.
					</DialogDescription>
				</DialogHeader>

				<Tabs
					defaultValue="general"
					className="min-h-0 flex-1 sm:grid sm:grid-cols-[150px_minmax(0,1fr)] sm:items-start sm:gap-5 sm:p-5"
				>
					<TabsList className="grid h-auto w-full shrink-0 grid-cols-2 gap-1 !rounded-none !border-0 !bg-transparent !p-0 sm:flex sm:w-[150px] sm:flex-col sm:items-stretch sm:self-start sm:!rounded-none sm:!border-0 sm:!bg-transparent sm:!p-0">
						<TabsTrigger value="general" className="justify-start gap-2">
							<Settings2 className="size-4" />
							General
						</TabsTrigger>
						<TabsTrigger value="account" className="justify-start gap-2">
							<UserRound className="size-4" />
							Account
						</TabsTrigger>
					</TabsList>

					<TabsContent
						value="general"
						className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5 sm:h-full sm:p-1"
					>
						<div className="mx-auto max-w-xl space-y-6">
							<div>
								<h2 className="text-base font-semibold">Appearance</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									Choose the theme used by EPMS on this device.
								</p>
							</div>
							<div className="grid gap-2 sm:grid-cols-3">
								{themeOptions.map(({ value, label, icon: Icon }) => (
									<Button
										key={value}
										variant={theme === value ? "default" : "outline"}
										className="justify-start gap-2"
										onClick={() => setTheme(value)}
									>
										<Icon className="size-4" />
										{label}
									</Button>
								))}
							</div>
						</div>
					</TabsContent>

					<TabsContent
						value="account"
						className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5 sm:h-full sm:p-1"
					>
						<div className="mx-auto max-w-xl space-y-8">
							<section className="space-y-4">
								<div className="flex items-center gap-4">
									<Avatar className="size-16" size="lg">
										<AvatarImage
											src={avatarPreview ?? user.avatarUrl ?? undefined}
											alt={user.firstName}
										/>
										<AvatarFallback>{initials}</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<h2 className="text-base font-semibold">Profile</h2>
										<p className="mt-1 text-sm text-muted-foreground">
											Update the personal details shown across the system.
										</p>
										<div className="mt-3 flex flex-wrap items-center gap-2">
											<input
												ref={avatarInputRef}
												type="file"
												accept="image/jpeg,image/png,image/webp"
												className="sr-only"
												onChange={(event) =>
													setAvatarFile(event.target.files?.[0] ?? null)
												}
											/>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => avatarInputRef.current?.click()}
											>
												<Camera className="size-4" />
												Choose photo
											</Button>
											{avatarFile && (
												<Button
													type="button"
													size="sm"
													onClick={uploadAvatar}
													disabled={uploadingAvatar}
												>
													{uploadingAvatar ? "Uploading..." : "Upload photo"}
												</Button>
											)}
										</div>
										<p className="mt-1 text-xs text-muted-foreground">
											JPEG, PNG, or WebP up to 5MB.
										</p>
									</div>
								</div>
								<div className="grid gap-4 sm:grid-cols-2">
									{(
										[
											["firstName", "First name"],
											["middleName", "Middle name"],
											["lastName", "Last name"],
											["nameSuffix", "Suffix"],
											["academicRank", "Academic rank"],
										] as const
									).map(([field, label]) => (
										<label
											key={field}
											htmlFor={`settings-${field}`}
											className="space-y-1.5 text-sm font-medium"
										>
											<span>{label}</span>
											<Input
												id={`settings-${field}`}
												value={profile[field]}
												onChange={(event) =>
													updateProfileField(field, event.target.value)
												}
											/>
										</label>
									))}
								</div>
								<Button onClick={saveProfile} disabled={savingProfile}>
									{savingProfile ? "Saving..." : "Save profile"}
								</Button>
							</section>

							<section className="grid gap-4 border-y border-border py-5 text-sm sm:grid-cols-2">
								{[
									["Email", user.email],
									["Role", user.roleName],
									["Campus", user.campusName],
									["Department", user.departmentName ?? "Not assigned"],
								].map(([label, value]) => (
									<p key={label}>
										<span className="mb-1 block text-xs text-muted-foreground">
											{label}
										</span>
										<span className="font-medium">{value}</span>
									</p>
								))}
							</section>

							<section className="space-y-4">
								<div>
									<h2 className="text-base font-semibold">Password</h2>
									<p className="mt-1 text-sm text-muted-foreground">
										Use at least 8 characters and avoid reusing passwords.
									</p>
								</div>
								<div className="space-y-4">
									{(
										[
											["currentPassword", "Current password"],
											["newPassword", "New password"],
											["confirmPassword", "Confirm new password"],
										] as const
									).map(([field, label]) => (
										<label
											key={field}
											htmlFor={`settings-password-${field}`}
											className="block space-y-1.5 text-sm font-medium"
										>
											<span>{label}</span>
											<Input
												id={`settings-password-${field}`}
												type="password"
												value={password[field]}
												onChange={(event) =>
													setPassword((current) => ({
														...current,
														[field]: event.target.value,
													}))
												}
											/>
										</label>
									))}
								</div>
								<Button
									variant="outline"
									onClick={savePassword}
									disabled={savingPassword}
								>
									{savingPassword ? "Changing..." : "Change password"}
								</Button>
							</section>
						</div>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
