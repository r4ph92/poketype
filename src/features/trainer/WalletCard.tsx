'use client';
import { useFormatter, useTranslations } from 'next-intl';
import { PixelLink } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';

export function WalletCard({ coins }: { coins: number }) {
  const t = useTranslations('Trainer');
  const format = useFormatter();
  return (
    <PixelPanel titleId="wallet-title" title={t('wallet')}>
      <div className="wallet-card">
        <p className="coin-balance">{t('coinAmount', { amount: format.number(coins) })}</p>
        <PixelLink href="/play/shop">{t('shopLink')}</PixelLink>
      </div>
    </PixelPanel>
  );
}
