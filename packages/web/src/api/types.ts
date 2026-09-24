import type { IllustrationInput, IllustrationResultDTO, PolicyType } from '@app/core'

export interface MaskedUser {
  id: string
  role: 'CUSTOMER' | 'ADMIN'
  fullName: string
  email: string
  dob: string
  mobile: string
  createdAt: string
}

export interface Column {
  key: string
  label: string
  money: boolean
}

export type PolicyTypeView = PolicyType & { rateVersion: string }

export interface IllustrationView extends IllustrationResultDTO {
  id?: string
  createdAt?: string
  asOf: string
  policyType: { code: string; name: string }
  input: IllustrationInput
  columns: Column[]
}

export interface IllustrationListItem {
  id: string
  policyType: { code: string; name: string }
  sumAssured: string
  policyTerm: number
  premiumTerm: number
  frequency: string
  riderCodes: string[]
  asOf: string
  entryAge: number
  modalPremium: string
  totalPremium: string
  maturityBenefit: string
  createdAt: string
}
