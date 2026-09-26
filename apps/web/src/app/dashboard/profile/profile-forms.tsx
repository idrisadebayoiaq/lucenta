"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { PasswordInput, PasswordStrength } from "@/components/ui/password-input";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "../nav";
import {
  changeEmail,
  changePassword,
  deleteAccount,
  deleteAllHistory,
  setAvatarUrl,
  updateProfile,
  type FormState,
} from "./actions";

function useToastOnSuccess(state: FormState) {
  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state]);
}

export function AvatarCard({ profile }: { profile: Tables<"profiles"> }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    if (file.size > 2 * 1024 * 1024) return toast.error("Image must be 2 MB or smaller.");
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return toast.error("Use a PNG, JPG, WEBP or GIF image.");

    setBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;

    const { data: existing } = await supabase.storage.from("avatars").list(profile.id);
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    if (existing?.length) await supabase.storage.from("avatars").remove(existing.map((f) => `${profile.id}/${f.name}`));

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const res = await setAvatarUrl(data.publicUrl);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Profile photo updated.");
    router.refresh();
  }

  async function onRemove() {
    setBusy(true);
    const res = await setAvatarUrl(null);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Profile photo removed.");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
        <div className="relative">
          <Avatar user={{ name: profile.full_name, email: profile.email, avatarUrl: profile.avatar_url }} size={96} />
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border bg-card shadow hover:bg-muted cursor-pointer"
            aria-label="Upload photo"
            disabled={busy}
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
        <div>
          <p className="font-semibold">{profile.full_name || "Unnamed user"}</p>
          {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} loading={busy}>
            Upload photo
          </Button>
          {profile.avatar_url && (
            <Button size="sm" variant="ghost" onClick={onRemove} disabled={busy}>
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP or GIF. Max 2 MB.</p>
      </CardContent>
    </Card>
  );
}

export function ProfileForm({ profile }: { profile: Tables<"profiles"> }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  useToastOnSuccess(state);
  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal information</CardTitle>
        <CardDescription>This information appears on your profile and reports.</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" defaultValue={profile.full_name ?? ""} aria-invalid={!!fe.fullName} />
            <FieldError message={fe.fullName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">@</span>
              <Input id="username" name="username" className="pl-7" defaultValue={profile.username ?? ""} aria-invalid={!!fe.username} />
            </div>
            <FieldError message={fe.username} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job title</Label>
            <Input id="jobTitle" name="jobTitle" defaultValue={profile.job_title ?? ""} placeholder="Marketing manager" />
            <FieldError message={fe.jobTitle} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" defaultValue={profile.company ?? ""} placeholder="Acme Inc." />
            <FieldError message={fe.company} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" defaultValue={profile.website ?? ""} placeholder="example.com" aria-invalid={!!fe.website} />
            <FieldError message={fe.website} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue={profile.location ?? ""} placeholder="Lagos, Nigeria" />
            <FieldError message={fe.location} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={500} placeholder="Tell us a little about yourself" />
            <FieldError message={fe.bio} />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" loading={pending}>
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function EmailForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changeEmail, {});
  useToastOnSuccess(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email address</CardTitle>
        <CardDescription>
          Current: <span className="font-medium text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-2">
          <Label htmlFor="email">New email</Label>
          <Input id="email" name="email" type="email" placeholder="new@example.com" />
          <FieldError message={state.fieldErrors?.email} />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" variant="outline" loading={pending}>
            Update email
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await changePassword(prev, formData);
    if (result.success) {
      formRef.current?.reset();
      setPassword("");
    }
    return result;
  }, {});
  useToastOnSuccess(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Use a strong password you don&apos;t use anywhere else.</CardDescription>
      </CardHeader>
      <form action={action} ref={formRef}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" />
            <FieldError message={state.fieldErrors?.currentPassword} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <FieldError message={state.fieldErrors?.newPassword} />
            <PasswordStrength password={password} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" />
            <FieldError message={state.fieldErrors?.confirmPassword} />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" variant="outline" loading={pending}>
            Change password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function DangerZone() {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, {});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [historyPending, startHistory] = useTransition();
  const router = useRouter();

  function onDeleteHistory() {
    if (!window.confirm("Delete all your scans and text checks? This cannot be undone.")) return;
    startHistory(async () => {
      const res = await deleteAllHistory();
      if (res.error) toast.error(res.error);
      else {
        toast.success("All history deleted.");
        router.refresh();
      }
    });
  }

  return (
    <Card className="border-rose-500/40">
      <CardHeader>
        <CardTitle className="text-rose-600">Danger zone</CardTitle>
        <CardDescription>These actions are permanent.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Delete all history</p>
            <p className="text-sm text-muted-foreground">Removes every website scan and text check.</p>
          </div>
          <Button variant="outline" onClick={onDeleteHistory} loading={historyPending}>
            <Trash2 className="h-4 w-4" /> Delete history
          </Button>
        </div>
        <div className="h-px bg-border" />
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-sm text-muted-foreground">Permanently deletes your account, profile, photo and all data.</p>
            </div>
            {!confirmOpen && (
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                Delete account
              </Button>
            )}
          </div>
          {confirmOpen && (
            <form action={action} className="space-y-3 rounded-lg border border-rose-500/40 bg-rose-500/5 p-4">
              {state.error && <Alert tone="danger" title={state.error} />}
              <Label htmlFor="confirm">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </Label>
              <Input id="confirm" name="confirm" autoComplete="off" />
              <FieldError message={state.fieldErrors?.confirm} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" loading={pending}>
                  Permanently delete
                </Button>
              </div>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
