import { FC, Fragment } from 'react';
import { IMultiTransferData } from '../forms/transfer-popup/multi-transfer-popup';
import { NumberUtil } from '@/util/shared/number.util';
import Divider from '../ui/divider';

interface MultiTransferSummaryTableProps {
  multiTransferData: IMultiTransferData;
}

// TODO
const MultiTransferSummaryTable: FC<MultiTransferSummaryTableProps> = ({
  multiTransferData,
}) => {
  return (
    <div className='flex flex-col'>
      {multiTransferData.map(({ cashAmount, username }, index) => (
        <Fragment key={username}>
          <div className='flex flex-row gap-3'>
            <p className='flex-1'>{username}</p>
            <p className='flex-1'>
              {
                NumberUtil.getCashAmount(cashAmount * 100, { withComma: true })
                  .displayString
              }
            </p>
          </div>
          {index <= multiTransferData.length - 1 && <Divider />}
        </Fragment>
      ))}
    </div>
  );
};

export default MultiTransferSummaryTable;
