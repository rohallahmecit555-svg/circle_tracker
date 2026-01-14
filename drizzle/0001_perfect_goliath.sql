CREATE TABLE `alertConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`thresholdAmount` decimal(38,6) NOT NULL DEFAULT '1000000',
	`enabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alertConfigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`txHash` varchar(66) NOT NULL,
	`logIndex` int NOT NULL,
	`chainId` int NOT NULL,
	`contractAddress` varchar(42) NOT NULL,
	`eventName` varchar(100) NOT NULL,
	`topics` json,
	`data` json,
	`blockNumber` bigint NOT NULL,
	`timestamp` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `statistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`chainId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`totalAmount` decimal(38,6) NOT NULL DEFAULT '0',
	`avgAmount` decimal(38,6) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `statistics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`txHash` varchar(66) NOT NULL,
	`chainId` int NOT NULL,
	`chainName` varchar(50) NOT NULL,
	`blockNumber` bigint NOT NULL,
	`timestamp` timestamp NOT NULL,
	`fromAddress` varchar(42) NOT NULL,
	`toAddress` varchar(42) NOT NULL,
	`amount` decimal(38,6) NOT NULL,
	`type` enum('CIRCLE_MINT','CIRCLE_BURN','CCTP_BURN','CCTP_MINT','OTHER') NOT NULL,
	`sourceChain` varchar(50),
	`targetChain` varchar(50),
	`messageHash` varchar(66),
	`status` enum('PENDING','CONFIRMED','FAILED') NOT NULL DEFAULT 'CONFIRMED',
	`rawData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `transactions_txHash_unique` UNIQUE(`txHash`)
);
--> statement-breakpoint
CREATE INDEX `alertConfig_userId_idx` ON `alertConfigs` (`userId`);--> statement-breakpoint
CREATE INDEX `event_txHash_idx` ON `events` (`txHash`);--> statement-breakpoint
CREATE INDEX `event_chainId_idx` ON `events` (`chainId`);--> statement-breakpoint
CREATE INDEX `eventName_idx` ON `events` (`eventName`);--> statement-breakpoint
CREATE INDEX `date_chain_type_idx` ON `statistics` (`date`,`chainId`,`type`);--> statement-breakpoint
CREATE INDEX `txHash_idx` ON `transactions` (`txHash`);--> statement-breakpoint
CREATE INDEX `chainId_idx` ON `transactions` (`chainId`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `transactions` (`type`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `transactions` (`timestamp`);