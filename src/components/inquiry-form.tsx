"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRightIcon, CheckIcon, HeartIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { submitInquiry } from "@/app/actions";
import { inquirySchema, todayLocal, type InquiryInput } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

type PackageOption = {
  id: string;
  name: string;
  price: number;
  inclusions: string[];
  extras: string[];
};

// 16px text stops iOS Safari zooming on focus; 48px height is a comfortable tap target.
const inputClass = "h-12 rounded-xl px-3.5 text-base md:text-base";

export function InquiryForm({
  packages,
  defaultPackageId,
  showPrices,
  currency,
  filmsUrl,
}: {
  packages: PackageOption[];
  defaultPackageId?: string;
  showPrices: boolean;
  currency: string;
  filmsUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<{ firstName: string } | null>(null);

  const form = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      partnerFirstName: "",
      partnerLastName: "",
      email: "",
      phone: "",
      weddingDate: "",
      packageId: defaultPackageId ?? (packages.length === 1 ? packages[0].id : ""),
      notes: "",
    },
  });
  const { register, handleSubmit, formState, setError, control } = form;
  const errors = formState.errors;

  const money = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await submitInquiry(values);
      if (result.ok) {
        setDone({ firstName: result.firstName });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (result.fieldErrors) {
        for (const [key, message] of Object.entries(result.fieldErrors)) {
          setError(key as keyof InquiryInput, { message }, { shouldFocus: true });
        }
      }
      toast.error(result.error);
    });
  });

  if (done) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent">
            <HeartIcon className="size-7 fill-gold text-gold-deep" aria-hidden />
          </span>
          <h2 className="font-heading text-3xl font-semibold">
            You&apos;re all set, {done.firstName}!
          </h2>
          <p className="text-base text-muted-foreground text-pretty">
            Keep an eye on your inbox. We&apos;ll email you the booking form for
            your package shortly.
          </p>
          <Button
            render={<a href={filmsUrl} target="_blank" rel="noopener" />}
            nativeButton={false}
            variant="outline"
            className="mt-3 h-12 w-full rounded-xl text-base"
          >
            Watch our films while you wait
            <ArrowUpRightIcon data-icon="inline-end" aria-hidden />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Card className="rounded-2xl">
        <CardContent>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>About you</FieldLegend>
              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!errors.firstName}>
                  <FieldLabel htmlFor="firstName">First name</FieldLabel>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    className={inputClass}
                    aria-invalid={!!errors.firstName}
                    {...register("firstName")}
                  />
                  <FieldError errors={[errors.firstName]} />
                </Field>
                <Field data-invalid={!!errors.lastName}>
                  <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    className={inputClass}
                    aria-invalid={!!errors.lastName}
                    {...register("lastName")}
                  />
                  <FieldError errors={[errors.lastName]} />
                </Field>
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Your partner</FieldLegend>
              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!errors.partnerFirstName}>
                  <FieldLabel htmlFor="partnerFirstName">First name</FieldLabel>
                  <Input
                    id="partnerFirstName"
                    autoComplete="off"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    className={inputClass}
                    aria-invalid={!!errors.partnerFirstName}
                    {...register("partnerFirstName")}
                  />
                  <FieldError errors={[errors.partnerFirstName]} />
                </Field>
                <Field data-invalid={!!errors.partnerLastName}>
                  <FieldLabel htmlFor="partnerLastName">
                    Last name <span className="font-normal text-muted-foreground">(optional)</span>
                  </FieldLabel>
                  <Input
                    id="partnerLastName"
                    autoComplete="off"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    className={inputClass}
                    aria-invalid={!!errors.partnerLastName}
                    {...register("partnerLastName")}
                  />
                  <FieldError errors={[errors.partnerLastName]} />
                </Field>
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Contact details</FieldLegend>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  className={inputClass}
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <FieldDescription>
                  We&apos;ll email your booking form here.
                </FieldDescription>
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={!!errors.phone}>
                <FieldLabel htmlFor="phone">Mobile number</FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="next"
                  className={inputClass}
                  aria-invalid={!!errors.phone}
                  {...register("phone")}
                />
                <FieldError errors={[errors.phone]} />
              </Field>
              <Field data-invalid={!!errors.weddingDate}>
                <FieldLabel htmlFor="weddingDate">Wedding date</FieldLabel>
                <Input
                  id="weddingDate"
                  type="date"
                  min={todayLocal()}
                  className={`${inputClass} block appearance-none [&::-webkit-date-and-time-value]:text-left`}
                  aria-invalid={!!errors.weddingDate}
                  {...register("weddingDate")}
                />
                <FieldError errors={[errors.weddingDate]} />
              </Field>
            </FieldSet>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent>
          <FieldSet data-invalid={!!errors.packageId}>
            <FieldLegend>Choose your package</FieldLegend>
            <Controller
              control={control}
              name="packageId"
              render={({ field }) => (
                <RadioGroup
                  name={field.name}
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as string)}
                  aria-invalid={!!errors.packageId}
                  className="gap-3"
                >
                  {packages.map((pkg) => (
                    <FieldLabel
                      key={pkg.id}
                      htmlFor={`pkg-${pkg.id}`}
                      className="rounded-xl! active:bg-muted/60"
                    >
                      <Field orientation="horizontal" className="min-h-14 p-4!">
                        <FieldContent>
                          <FieldTitle className="font-heading text-2xl font-semibold">{pkg.name}</FieldTitle>
                          {showPrices && pkg.price > 0 ? (
                            <p className="font-heading text-xl font-semibold text-gold-deep">
                              {money.format(pkg.price)}
                            </p>
                          ) : null}
                          {pkg.inclusions.length ? (
                            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
                              {pkg.inclusions.map((item) => (
                                <li key={item} className="flex gap-2">
                                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-gold-deep" aria-hidden />
                                  <span>{item.replace(/s*|s*Wedding Video Package$/i, "")}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {pkg.extras.length ? (
                            <FieldDescription className="mt-2 text-xs">
                              Optional extras: {pkg.extras.join(", ")}
                            </FieldDescription>
                          ) : null}
                        </FieldContent>
                        <RadioGroupItem
                          value={pkg.id}
                          id={`pkg-${pkg.id}`}
                          className="size-5"
                        />
                      </Field>
                    </FieldLabel>
                  ))}
                </RadioGroup>
              )}
            />
            <FieldError errors={[errors.packageId]} />
          </FieldSet>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent>
          <Field data-invalid={!!errors.notes}>
            <FieldLabel htmlFor="notes">
              Anything else? <span className="font-normal text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Venue, guest count, anything you'd love filmed…"
              className="min-h-24 rounded-xl px-3.5 py-3 text-base md:text-base"
              {...register("notes")}
            />
            <FieldError errors={[errors.notes]} />
          </Field>
        </CardContent>
      </Card>


      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-14 w-full rounded-xl text-base font-semibold"
      >
        {pending ? (
          <>
            <Loader2Icon className="size-5 animate-spin" aria-hidden />
            Saving your details…
          </>
        ) : (
          "Send me the details"
        )}
      </Button>
      <p className="-mt-2 text-center text-xs text-muted-foreground">
        By submitting you agree to be contacted about your wedding.
      </p>
    </form>
  );
}
