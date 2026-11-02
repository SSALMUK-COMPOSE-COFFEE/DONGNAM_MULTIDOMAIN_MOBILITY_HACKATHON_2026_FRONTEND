'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcwIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { postDemoReset } from '@/apis/postDemoReset';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/consts/route';
import { usePlanStore } from '@/stores/usePlanStore';

/** 리허설마다 서버 계획과 화면 상태를 처음으로 되돌린다 */
export function DemoResetButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearPlan = usePlanStore(state => state.clearPlan);

  const { mutate: reset, isPending } = useMutation({
    mutationFn: postDemoReset,
    onSuccess: () => {
      clearPlan();
      queryClient.clear();
      router.push(ROUTES.INTAKE);
      toast.success('시연을 처음 상태로 되돌렸습니다.');
    },
    onError: () => toast.error('초기화하지 못했습니다. 서버 연결을 확인하세요.'),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isPending}>
          <RotateCcwIcon />
          시연 초기화
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>시연을 처음부터 다시 할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            서버에 있는 모든 계획이 지워지고 출하 입력 화면으로 돌아갑니다. 같은 서버를 쓰는 다른
            사람의 계획도 함께 지워집니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={() => reset()}>초기화</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
