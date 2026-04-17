import React from 'react';
import { cn } from '@/lib/utils';

type BGVariantType =
  | 'dots'
  | 'diagonal-stripes'
  | 'grid'
  | 'horizontal-lines'
  | 'vertical-lines'
  | 'checkerboard';

type BGMaskType =
  | 'fade-center'
  | 'fade-edges'
  | 'fade-top'
  | 'fade-bottom'
  | 'fade-left'
  | 'fade-right'
  | 'fade-x'
  | 'fade-y'
  | 'none';

type BGPatternProps = React.ComponentProps<'div'> & {
  variant?: BGVariantType;
  mask?: BGMaskType;
  size?: number;
  fill?: string;
};

const maskClasses: Record<BGMaskType, string> = {
  'fade-edges': '[mask-image:radial-gradient(ellipse_at_center,var(--color-background),transparent)]',
  'fade-center': '[mask-image:radial-gradient(ellipse_at_center,transparent,var(--color-background))]',
  'fade-top': '[mask-image:linear-gradient(to_bottom,transparent,var(--color-background))]',
  'fade-bottom': '[mask-image:linear-gradient(to_bottom,var(--color-background),transparent)]',
  'fade-left': '[mask-image:linear-gradient(to_right,transparent,var(--color-background))]',
  'fade-right': '[mask-image:linear-gradient(to_right,var(--color-background),transparent)]',
  'fade-x': '[mask-image:linear-gradient(to_right,transparent,var(--color-background),transparent)]',
  'fade-y': '[mask-image:linear-gradient(to_bottom,transparent,var(--color-background),transparent)]',
  none: '',
};

function getBgImage(variant: BGVariantType, fill: string, size: number) {
  switch (variant) {
    case 'dots':
      return `radial-gradient(${fill} 1px, transparent 1px)`;
    case 'grid':
      return `linear-gradient(to right, ${fill} 1px, transparent 1px), linear-gradient(to bottom, ${fill} 1px, transparent 1px)`;
    case 'diagonal-stripes':
      return `repeating-linear-gradient(45deg, ${fill}, ${fill} 1px, transparent 1px, transparent ${size}px)`;
    case 'horizontal-lines':
      return `linear-gradient(to bottom, ${fill} 1px, transparent 1px)`;
    case 'vertical-lines':
      return `linear-gradient(to right, ${fill} 1px, transparent 1px)`;
    case 'checkerboard':
      return `linear-gradient(45deg, ${fill} 25%, transparent 25%), linear-gradient(-45deg, ${fill} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${fill} 75%), linear-gradient(-45deg, transparent 75%, ${fill} 75%)`;
    default:
      return undefined;
  }
}

const BGPattern = ({
  variant = 'grid',
  mask = 'none',
  size = 24,
  fill = '#252525',
  className,
  style,
  ...props
}: BGPatternProps) => {
  const backgroundImage = getBgImage(variant, fill, size);

  return (
    <div
      className={cn('absolute inset-0 z-[-10] size-full', maskClasses[mask], className)}
      style={{
        backgroundImage,
        backgroundSize: `${size}px ${size}px`,
        ...style,
      }}
      {...props}
    />
  );
};

BGPattern.displayName = 'BGPattern';

export { BGPattern };
