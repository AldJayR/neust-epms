import * as React from "react";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Trash2, 
  Upload, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  FileText
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  createProposalFn, 
  uploadProposalDocumentFn, 
  sdgsQueryOptions, 
  campusesQueryOptions,
  departmentsQueryOptions
} from "@/lib/ret.functions";
import { searchUsersFn } from "@/lib/auth.functions";
import type { AuthUser } from "@/lib/auth";

const formSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  bannerProgram: z.string().min(1, "Banner program is required"),
  projectLocale: z.string().min(1, "Project locale is required"),
  extensionCategory: z.string().min(1, "Extension category is required"),
  campusId: z.string().min(1, "Campus is required"),
  departmentId: z.string().min(1, "Department is required"),
  sdgIds: z.array(z.number()).min(1, "Select at least one SDG"),
  targetStartDate: z.string().min(1, "Start date is required"),
  targetEndDate: z.string().min(1, "End date is required"),
  budgetPartner: z.number().min(0),
  budgetNeust: z.number().min(0),
  members: z.array(z.object({
    userId: z.string().uuid(),
    projectRole: z.string().min(1, "Role is required"),
    name: z.string() // helper for UI
  })).min(1, "At least one team member is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateProposalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AuthUser;
}

export function CreateProposalModal({ open, onOpenChange, user }: CreateProposalModalProps) {
  const [step, setStep] = React.useState(1);
  const [file, setFile] = React.useState<File | null>(null);
  const [userSearch, setUserSearch] = React.useState("");
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      bannerProgram: "",
      projectLocale: "",
      extensionCategory: "",
      campusId: user.campusId.toString(),
      departmentId: user.departmentId?.toString() ?? "",
      sdgIds: [],
      targetStartDate: "",
      targetEndDate: "",
      budgetPartner: 0,
      budgetNeust: 0,
      members: [
        { 
          userId: user.userId, 
          projectRole: "Project Leader", 
          name: `${user.firstName} ${user.lastName}` 
        }
      ],
    },
  });

  const { fields: memberFields, append: appendMember, remove: removeMember } = useFieldArray({
    control: form.control,
    name: "members",
  });

  const sdgsQuery = useQuery(sdgsQueryOptions());
  const campusesQuery = useQuery(campusesQueryOptions());
  const departmentsQuery = useQuery(departmentsQueryOptions());

  const searchUsersQuery = useQuery({
    queryKey: ["users", "search", userSearch],
    queryFn: () => searchUsersFn({ data: { search: userSearch } }),
    enabled: userSearch.length > 2,
  });

  const createProposalMutation = useMutation({
    mutationFn: createProposalFn,
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: uploadProposalDocumentFn,
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (!file) {
      toast.error("Please upload the Project Proposal PDF");
      return;
    }

    try {
      const proposal = await createProposalMutation.mutateAsync({
        data: {
          campusId: Number(values.campusId),
          departmentId: Number(values.departmentId),
          title: values.title,
          bannerProgram: values.bannerProgram,
          projectLocale: values.projectLocale,
          extensionCategory: values.extensionCategory,
          budgetPartner: values.budgetPartner,
          budgetNeust: values.budgetNeust,
          targetStartDate: new Date(values.targetStartDate).toISOString(),
          targetEndDate: new Date(values.targetEndDate).toISOString(),
          sdgIds: values.sdgIds,
          members: values.members.map(m => ({ userId: m.userId, projectRole: m.projectRole })),
        }
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("proposalId", proposal.proposalId);
      
      await uploadDocumentMutation.mutateAsync({ data: formData });

      toast.success("Project proposal submitted successfully!");
      onOpenChange(false);
      form.reset();
      setStep(1);
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["ret", "dashboard"] });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof FormValues)[] = [];
    if (step === 1) {
      fieldsToValidate = ["title", "bannerProgram", "projectLocale", "extensionCategory", "campusId", "departmentId", "sdgIds"];
    } else if (step === 2) {
      fieldsToValidate = ["targetStartDate", "targetEndDate", "budgetPartner", "budgetNeust"];
    } else if (step === 3) {
      fieldsToValidate = ["members"];
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf") {
        toast.error("Only PDF files are allowed");
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden gap-0">
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <DialogHeader className="p-6 border-b border-[#ebebeb]">
              <DialogTitle className="text-xl font-semibold text-[#11215a]">
                Start New Project Proposal
              </DialogTitle>
              <DialogDescription className="text-sm text-[#666]">
                Step {step} of 4: {
                  step === 1 ? "Project Overview" :
                  step === 2 ? "Timeline & Budget" :
                  step === 3 ? "Team Composition" :
                  "Attachments"
                }
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {step === 1 && (
                <div className="space-y-4">
                  <Field>
                    <FieldLabel>Project Title</FieldLabel>
                    <FieldContent>
                      <Input placeholder="Enter project title" {...form.register("title")} />
                    </FieldContent>
                    <FieldError errors={[form.formState.errors.title]} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel>Banner Program</FieldLabel>
                      <FieldContent>
                        <Input placeholder="e.g. Community Outreach" {...form.register("bannerProgram")} />
                      </FieldContent>
                      <FieldError errors={[form.formState.errors.bannerProgram]} />
                    </Field>
                    <Field>
                      <FieldLabel>Project Locale</FieldLabel>
                      <FieldContent>
                        <Input placeholder="e.g. Cabanatuan City" {...form.register("projectLocale")} />
                      </FieldContent>
                      <FieldError errors={[form.formState.errors.projectLocale]} />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel>Extension Category</FieldLabel>
                    <FieldContent>
                      <Select 
                        onValueChange={(val) => { if (val != null) form.setValue("extensionCategory", val); }} 
                        defaultValue={form.getValues("extensionCategory")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Category A">Category A</SelectItem>
                          <SelectItem value="Category B">Category B</SelectItem>
                          <SelectItem value="Category C">Category C</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldContent>
                    <FieldError errors={[form.formState.errors.extensionCategory]} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel>Campus</FieldLabel>
                      <FieldContent>
                        <Select 
                          onValueChange={(val) => { if (val != null) form.setValue("campusId", val); }} 
                          defaultValue={form.getValues("campusId")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select campus" />
                          </SelectTrigger>
                          <SelectContent>
                            {campusesQuery.data?.map(campus => (
                              <SelectItem key={campus.id} value={campus.id.toString()}>
                                {campus.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldContent>
                      <FieldError errors={[form.formState.errors.campusId]} />
                    </Field>
                    <Field>
                      <FieldLabel>Department</FieldLabel>
                      <FieldContent>
                        <Select 
                          onValueChange={(val) => { if (val != null) form.setValue("departmentId", val); }} 
                          defaultValue={form.getValues("departmentId")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departmentsQuery.data?.map(dept => (
                              <SelectItem key={dept.id} value={dept.id.toString()}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldContent>
                      <FieldError errors={[form.formState.errors.departmentId]} />
                    </Field>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Addressed SDGs</FieldLabel>
                    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                      {sdgsQuery.data?.map(sdg => (
                        <div key={sdg.sdgId} className="flex flex-row items-start space-x-3 space-y-0">
                          <Checkbox
                            checked={form.watch("sdgIds")?.includes(sdg.sdgId)}
                            onCheckedChange={(checked) => {
                              const current = form.getValues("sdgIds") || [];
                              if (checked) {
                                form.setValue("sdgIds", [...current, sdg.sdgId]);
                              } else {
                                form.setValue("sdgIds", current.filter(id => id !== sdg.sdgId));
                              }
                            }}
                          />
                          <span className="font-normal text-xs">
                            {sdg.sdgName}
                          </span>
                        </div>
                      ))}
                    </div>
                    <FieldError errors={[form.formState.errors.sdgIds]} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel>Target Start Date</FieldLabel>
                      <FieldContent>
                        <Input type="date" {...form.register("targetStartDate")} />
                      </FieldContent>
                      <FieldError errors={[form.formState.errors.targetStartDate]} />
                    </Field>
                    <Field>
                      <FieldLabel>Target End Date</FieldLabel>
                      <FieldContent>
                        <Input type="date" {...form.register("targetEndDate")} />
                      </FieldContent>
                      <FieldError errors={[form.formState.errors.targetEndDate]} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel>Budget (Partner)</FieldLabel>
                      <FieldContent>
                        <Input type="number" {...form.register("budgetPartner", { valueAsNumber: true })} />
                      </FieldContent>
                      <FieldError errors={[form.formState.errors.budgetPartner]} />
                    </Field>
                    <Field>
                      <FieldLabel>Budget (NEUST)</FieldLabel>
                      <FieldContent>
                        <Input type="number" {...form.register("budgetNeust", { valueAsNumber: true })} />
                      </FieldContent>
                      <FieldError errors={[form.formState.errors.budgetNeust]} />
                    </Field>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <FieldLabel>Search Team Members</FieldLabel>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        placeholder="Search by name or email" 
                        className="pl-9"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                    {searchUsersQuery.data && searchUsersQuery.data.length > 0 && (
                      <div className="mt-2 border rounded-md divide-y shadow-sm max-h-[150px] overflow-y-auto">
                        {searchUsersQuery.data.map(u => (
                          <button
                            key={u.userId} 
                            type="button"
                            className="w-full text-left p-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                            onClick={() => {
                              if (!memberFields.some(m => m.userId === u.userId)) {
                                appendMember({ 
                                  userId: u.userId, 
                                  projectRole: "Member", 
                                  name: `${u.firstName} ${u.lastName}` 
                                });
                              } else {
                                toast.error("User is already a team member");
                              }
                              setUserSearch("");
                            }}
                          >
                            <div className="text-sm">
                              <p className="font-medium">{u.firstName} {u.lastName}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                            <Plus className="size-4 text-blue-600" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>Team Members & Roles</FieldLabel>
                    <div className="border rounded-md divide-y">
                      {memberFields.map((field, index) => (
                        <div key={field.id} className="p-3 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{field.name}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <Select 
                                value={form.watch(`members.${index}.projectRole`)}
                                onValueChange={(val) => { if (val != null) form.setValue(`members.${index}.projectRole`, val); }}
                              >
                                <SelectTrigger className="h-7 w-[150px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Project Leader">Project Leader</SelectItem>
                                  <SelectItem value="Co-Project Leader">Co-Project Leader</SelectItem>
                                  <SelectItem value="Project Staff">Project Staff</SelectItem>
                                  <SelectItem value="Member">Member</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {field.userId !== user.userId && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeMember(index)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <FieldError errors={[form.formState.errors.members]} />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-[#fcfcfc] border-[#e5e5e5]">
                    {file ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-blue-50 rounded-full">
                          <FileText className="size-8 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => setFile(null)}
                        >
                          Change File
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 bg-blue-50 rounded-full">
                          <Upload className="size-8 text-blue-600" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">Click to upload or drag and drop</p>
                          <p className="text-xs text-muted-foreground mt-1">Project Proposal PDF (Max 10MB)</p>
                        </div>
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          accept="application/pdf"
                          onChange={handleFileChange}
                        />
                        <Button 
                          variant="secondary" 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          render={<label htmlFor="file-upload" className="cursor-pointer" />}
                        >
                          Select File
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="p-6 border-t border-[#ebebeb] bg-[#fcfcfc]">
              <div className="flex items-center justify-between w-full">
                {step > 1 ? (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ChevronLeft className="mr-2 size-4" />
                    Previous
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                )}

                {step < 4 ? (
                  <Button type="button" onClick={nextStep} className="bg-[#11215a] hover:bg-[#11215a]/90">
                    Next
                    <ChevronRight className="ml-2 size-4" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                    disabled={createProposalMutation.isPending || uploadDocumentMutation.isPending}
                  >
                    {createProposalMutation.isPending || uploadDocumentMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Finish
                        <Check className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
