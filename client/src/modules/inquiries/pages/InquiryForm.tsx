import React from 'react';
import { NewInquiryPage, NewInquiryPageProps } from './NewInquiryPage';

export interface InquiryFormProps extends NewInquiryPageProps {}

/**
 * InquiryForm - Form component to create or edit inquiries.
 * Alias / wrapper around NewInquiryPage.
 */
export const InquiryForm: React.FC<InquiryFormProps> = (props) => {
  return <NewInquiryPage {...props} />;
};

export default InquiryForm;
