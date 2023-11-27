import { Meta, StoryObj } from '@storybook/react';
import Slogan, { ISlogan } from './Slogan';
import { mockSloganProps } from './Slogan.mocks';

export default {
  title: 'templates/Slogan',
  component: Slogan,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as Meta<typeof Slogan>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
type Template = StoryObj<ISlogan>;

export const Base: Template = (args: ISlogan) => (
  <Slogan {...args} />
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args

Base.args = {
  ...mockSloganProps.base,
} as ISlogan;