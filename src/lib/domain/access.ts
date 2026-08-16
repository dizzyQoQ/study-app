const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return code;
}

export function canApproveEvidence(params: {
  reviewerUid: string;
  uploaderUid: string;
  reviewerIsMember: boolean;
}): boolean {
  return params.reviewerIsMember && params.reviewerUid !== params.uploaderUid;
}

export function isAllowedEvidenceType(contentType: string): boolean {
  return contentType === "image/jpeg" || contentType === "image/png" || contentType === "application/pdf";
}

export function parseFirestoreRules(rules: string): {
  deniesUnauthenticatedDefault: boolean;
  requiresMemberToReadGroup: boolean;
  ownerControlsReview: boolean;
} {
  return {
    deniesUnauthenticatedDefault: rules.includes("allow read, write: if false"),
    requiresMemberToReadGroup: rules.includes("allow read: if isMember(groupId)"),
    ownerControlsReview: rules.includes("isOwner(groupId)"),
  };
}
