import React from 'react';
import { NewCallPage, NewCallPageProps } from './NewCallPage';

export interface CallFormProps extends NewCallPageProps {}

/**
 * CallForm - Form component to schedule or log calls.
 * Alias / wrapper around NewCallPage matching the InquiryForm convention.
 */
export const CallForm: React.FC<CallFormProps> = (props) => {
  return <NewCallPage {...props} />;
};

export default CallForm;
