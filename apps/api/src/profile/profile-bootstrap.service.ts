import { Injectable } from "@nestjs/common";
import type { Prisma, User } from "@prisma/client";

@Injectable()
export class ProfileBootstrapService {
  async ensureUserShell(
    tx: Prisma.TransactionClient,
    user: Pick<User, "id">,
    profile: {
      displayName: string;
      avatarUrl: string | null;
    }
  ): Promise<void> {
    await tx.profile.upsert({
      where: { userId: user.id },
      update: {
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      },
      create: {
        userId: user.id,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      },
    });

    await tx.userPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
      },
    });
  }
}
