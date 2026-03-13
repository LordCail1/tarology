import { Injectable, NotFoundException } from "@nestjs/common";
import type { GetProfileResponse, ProfileShellDto } from "@tarology/shared";
import { PrismaService } from "../database/prisma.service.js";

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<GetProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        authIdentities: {
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    if (!user?.profile || user.authIdentities.length === 0) {
      throw new NotFoundException("Profile not found.");
    }

    const identity = user.authIdentities[0];
    const profile: ProfileShellDto = {
      userId: user.id,
      email: user.email,
      displayName: user.profile.displayName,
      avatarUrl: user.profile.avatarUrl,
      provider: identity.provider,
      createdAt: user.createdAt.toISOString(),
    };

    return { profile };
  }
}
