CREATE TABLE "email_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"body_text" text NOT NULL,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_outbox_kind_check" CHECK ("email_outbox"."kind" IN ('verify_email', 'reset_password')),
	CONSTRAINT "email_outbox_status_check" CHECK ("email_outbox"."status" IN ('pending', 'retry_scheduled', 'sent', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "rate_limit_bucket" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_outbox_status_next_idx" ON "email_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "rate_limit_bucket_reset_at_idx" ON "rate_limit_bucket" USING btree ("reset_at");