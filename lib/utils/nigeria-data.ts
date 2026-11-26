import nigeriaLGAsData from './nigeria-lgas.json';

export const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT'
];

// LGA data adapted from https://github.com/temikeezy/nigeria-geojson-data (MIT).
export const nigerianLGAsByState: Record<string, string[]> = nigeriaLGAsData;
export const riversStateLGAs = nigerianLGAsByState.Rivers;

export const employmentTypes = [
  'Public Service',
  'Private Employment',
  'Self Employed',
  'Business Owner',
  'Student',
  'Retired',
  'Unemployed',
  'Other'
];

export const contributionAreas = [
  'Relationship / Networking',
  'Welfare',
  'Mentorship',
  'Education / Scholarship',
  'Publicity / Media',
  'Sports',
  'Other'
];

export const commonSkills = [
  'Software Development',
  'Teaching',
  'Medicine',
  'Engineering',
  'Accounting',
  'Law',
  'Business Management',
  'Marketing',
  'Media & Communications',
  'Photography',
  'Construction',
  'Agriculture',
  'Nursing',
  'Architecture',
  'Financial Services',
  'Consulting',
  'Human Resources',
  'Project Management',
  'Sales',
  'Administration'
];

export const schoolPositions = [
  'Not applicable',
  'Prefect',
  'Senior Prefect',
  'Class Representative',
  'House Captain',
  'Club/Society Leader',
  'Sports Captain',
  'Library Prefect',
  'Dining Prefect',
  'Other'
];

/**
 * Validate Nigerian phone number format
 */
export function validateNigerianPhone(phone: string): boolean {
  // Remove spaces, dashes, and plus signs
  const cleaned = phone.replace(/[\s\-+]/g, '');
  
  // Check if it's a valid Nigerian number
  // Format: 080xxxxxxxx, 070xxxxxxxx, 090xxxxxxxx, 081xxxxxxxx, 234xxxxxxxxxx
  const regex = /^(0[7-9][0-1]\d{8}|234[7-9][0-1]\d{8})$/;
  return regex.test(cleaned);
}

/**
 * Format phone number for storage
 */
export function formatNigerianPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-+]/g, '');
  
  // Convert to 234 format if starting with 0
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '234' + cleaned.substring(1);
  }
  
  return cleaned;
}
