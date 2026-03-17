"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Mail, Target, MessageCircle, Bell } from "lucide-react";
import { authAPI } from "@/lib/api";
import { toast } from "sonner";

type MeResponse = {
  data?: { user?: { email?: string; goal_type?: string } };
  user?: { email?: string; goal_type?: string };
};

type NotificationPrefs = {
  enabled_providers: string[];
  enabled_types: string[];
  quiet_hours_start: number;
  quiet_hours_end: number;
  timezone: string;
  whatsapp_number: string | null;
};

const PROVIDERS = [
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "sms", label: "SMS" },
];

const NOTIF_TYPES = [
  { id: "inventory_alert", label: "Inventory Alerts" },
  { id: "achievement", label: "Achievements" },
  { id: "meal_reminder", label: "Meal Reminders" },
];

export default function ProfilePage() {
  const [email, setEmail] = useState("user@example.com");
  const [displayName, setDisplayName] = useState("");
  const [goal, setGoal] = useState("Not set");

  // WhatsApp number (separate endpoint)
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappSaving, setWhatsappSaving] = useState(false);

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    enabled_providers: [],
    enabled_types: [],
    quiet_hours_start: 22,
    quiet_hours_end: 7,
    timezone: "UTC",
    whatsapp_number: null,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifLoaded, setNotifLoaded] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("profile_display_name");
    if (savedName) setDisplayName(savedName);

    authAPI
      .getMe()
      .then((data: unknown) => {
        const payload = data as MeResponse;
        const userEmail = payload?.data?.user?.email || payload?.user?.email;
        if (userEmail) setEmail(userEmail);
        const goalType = payload?.data?.user?.goal_type || payload?.user?.goal_type;
        if (goalType) setGoal(goalType);
      })
      .catch(() => {});

    authAPI
      .getNotificationPreferences()
      .then((data: unknown) => {
        const prefs = data as NotificationPrefs;
        setNotifPrefs({
          enabled_providers: prefs.enabled_providers ?? [],
          enabled_types: prefs.enabled_types ?? [],
          quiet_hours_start: prefs.quiet_hours_start ?? 22,
          quiet_hours_end: prefs.quiet_hours_end ?? 7,
          timezone: prefs.timezone ?? "UTC",
          whatsapp_number: prefs.whatsapp_number ?? null,
        });
        if (prefs.whatsapp_number) setWhatsappNumber(prefs.whatsapp_number);
        setNotifLoaded(true);
      })
      .catch(() => {
        setNotifLoaded(true);
      });
  }, []);

  const handleSave = () => {
    localStorage.setItem("profile_display_name", displayName.trim());
    toast.success("Profile preferences saved");
  };

  const handleSaveWhatsapp = async () => {
    const trimmed = whatsappNumber.trim();
    if (!trimmed) {
      toast.error("Please enter a WhatsApp number");
      return;
    }
    if (!/^\+\d{7,15}$/.test(trimmed)) {
      toast.error("Enter number in E.164 format, e.g. +916264547414");
      return;
    }
    setWhatsappSaving(true);
    try {
      await authAPI.updateWhatsappNumber(trimmed);
      toast.success("WhatsApp number updated successfully");
    } catch {
      toast.error("Failed to update WhatsApp number");
    } finally {
      setWhatsappSaving(false);
    }
  };

  const toggleProvider = (id: string) => {
    setNotifPrefs((prev) => ({
      ...prev,
      enabled_providers: prev.enabled_providers.includes(id)
        ? prev.enabled_providers.filter((p) => p !== id)
        : [...prev.enabled_providers, id],
    }));
  };

  const toggleType = (id: string) => {
    setNotifPrefs((prev) => ({
      ...prev,
      enabled_types: prev.enabled_types.includes(id)
        ? prev.enabled_types.filter((t) => t !== id)
        : [...prev.enabled_types, id],
    }));
  };

  const handleSaveNotifPrefs = async () => {
    const start = notifPrefs.quiet_hours_start;
    const end = notifPrefs.quiet_hours_end;
    if (start < 0 || start > 23 || end < 0 || end > 23) {
      toast.error("Quiet hours must be between 0 and 23");
      return;
    }
    setNotifSaving(true);
    try {
      const updated = await authAPI.updateNotificationPreferences({
        enabled_providers: notifPrefs.enabled_providers,
        enabled_types: notifPrefs.enabled_types,
        quiet_hours_start: start,
        quiet_hours_end: end,
        timezone: notifPrefs.timezone.trim() || "UTC",
      });
      setNotifPrefs((prev) => ({ ...prev, ...(updated as Partial<NotificationPrefs>) }));
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save notification preferences");
    } finally {
      setNotifSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-1">Account snapshot and personal display preferences</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium break-all">{email}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" /> Display Name
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{displayName || "Not set"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" /> Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">{goal}</Badge>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personalization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                placeholder="How should we address you?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <Button onClick={handleSave}>Save Preferences</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> WhatsApp Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-w-lg">
            <p className="text-sm text-muted-foreground">
              Link your WhatsApp number so the NutriLens bot can recognise and message you.
            </p>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-number">WhatsApp Number</Label>
              <Input
                id="whatsapp-number"
                placeholder="+916264547414"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Include country code in E.164 format</p>
            </div>
            <Button onClick={handleSaveWhatsapp} disabled={whatsappSaving}>
              {whatsappSaving ? "Saving…" : "Save WhatsApp Number"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 max-w-lg">
            {!notifLoaded ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                <div className="space-y-3">
                  <Label>Channels</Label>
                  <div className="space-y-2">
                    {PROVIDERS.map(({ id, label }) => (
                      <div key={id} className="flex items-center gap-2">
                        <Checkbox
                          id={`provider-${id}`}
                          checked={notifPrefs.enabled_providers.includes(id)}
                          onCheckedChange={() => toggleProvider(id)}
                        />
                        <Label htmlFor={`provider-${id}`} className="font-normal cursor-pointer">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Notification Types</Label>
                  <div className="space-y-2">
                    {NOTIF_TYPES.map(({ id, label }) => (
                      <div key={id} className="flex items-center gap-2">
                        <Checkbox
                          id={`type-${id}`}
                          checked={notifPrefs.enabled_types.includes(id)}
                          onCheckedChange={() => toggleType(id)}
                        />
                        <Label htmlFor={`type-${id}`} className="font-normal cursor-pointer">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Quiet Hours</Label>
                  <div className="flex items-center gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="quiet-start" className="text-xs text-muted-foreground">
                        Start (0–23)
                      </Label>
                      <Input
                        id="quiet-start"
                        type="number"
                        min={0}
                        max={23}
                        className="w-20"
                        value={notifPrefs.quiet_hours_start}
                        onChange={(e) =>
                          setNotifPrefs((prev) => ({
                            ...prev,
                            quiet_hours_start: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <span className="mt-5 text-muted-foreground">to</span>
                    <div className="space-y-1">
                      <Label htmlFor="quiet-end" className="text-xs text-muted-foreground">
                        End (0–23)
                      </Label>
                      <Input
                        id="quiet-end"
                        type="number"
                        min={0}
                        max={23}
                        className="w-20"
                        value={notifPrefs.quiet_hours_end}
                        onChange={(e) =>
                          setNotifPrefs((prev) => ({
                            ...prev,
                            quiet_hours_end: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    placeholder="Asia/Kolkata"
                    value={notifPrefs.timezone}
                    onChange={(e) =>
                      setNotifPrefs((prev) => ({ ...prev, timezone: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Standard tz string, e.g. Asia/Kolkata, UTC, America/New_York
                  </p>
                </div>

                <Button onClick={handleSaveNotifPrefs} disabled={notifSaving}>
                  {notifSaving ? "Saving…" : "Save Notification Preferences"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
